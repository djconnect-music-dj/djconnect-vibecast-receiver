"""Adversarial import tests. No network or hosting effects."""
import copy
import importlib.util
import io
import json
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
import unittest
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('import_vibecast', ROOT / 'scripts/import_vibecast.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)
class ImportTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        shutil.copytree(ROOT / 'vendor', self.root / 'vendor')
        shutil.copytree(ROOT / 'wwwroot', self.root / 'wwwroot')
        self.lock = json.loads((ROOT / 'vibecast-source-lock.json').read_bytes())
        self.lock_path = self.root / 'lock.json'; self.write_lock()
    def write_lock(self):
        self.lock_path.write_text(json.dumps(self.lock))
    def adopt(self, **kwargs):
        return importer.adopt(self.lock_path, root=self.root, **kwargs)
    def snapshot(self):
        return {p.name:p.read_bytes() for p in (self.root / 'wwwroot').iterdir() if p.is_file()}
    def test_reproducible_import_and_exact_restore(self):
        expected = self.snapshot(); self.adopt(check=True)
        (self.root / 'wwwroot/index.html').write_text('drift')
        with self.assertRaises(ValueError): self.adopt(check=True)
        self.adopt(); self.assertEqual(self.snapshot(), expected)
        self.adopt(); self.assertEqual(self.snapshot(), expected)
    def test_wrong_external_pins_fail_without_writes(self):
        for key in ['source_revision','bundle_sha256','manifest_sha256','renderer_sha256','verifier_sha256']:
            with self.subTest(key=key):
                saved = copy.deepcopy(self.lock); self.lock[key] = '0' * len(self.lock[key]); self.write_lock(); before = self.snapshot()
                with self.assertRaises((ValueError,subprocess.CalledProcessError)): self.adopt()
                self.assertEqual(before, self.snapshot()); self.lock = saved; self.write_lock()
    def test_corrupt_download_and_changed_verifier(self):
        archive = self.root / self.lock['bundle_file']; archive.write_bytes(archive.read_bytes()+b'changed')
        with self.assertRaises(ValueError): self.adopt()
        shutil.copyfile(ROOT / self.lock['bundle_file'], archive)
        (self.root / self.lock['verifier_file']).write_text("print('untrusted')")
        with self.assertRaises(ValueError): self.adopt()
    def archive(self, entries):
        path = self.root / 'test.tar.gz'
        with tarfile.open(path,'w:gz') as archive:
            for name,content,kind in entries:
                info=tarfile.TarInfo(name); info.type=kind
                if kind==tarfile.REGTYPE:
                    info.size=len(content); archive.addfile(info,io.BytesIO(content))
                else:
                    info.linkname='/tmp/escape'; archive.addfile(info)
        return path
    def test_missing_extra_duplicate_and_unsafe_archive(self):
        valid=[(name,b'test',tarfile.REGTYPE) for name in sorted(importer.ASSETS)]
        variants=[valid[:-1],valid+[('extra',b'x',tarfile.REGTYPE)],valid+[valid[0]], [('..'+'/escape',b'x',tarfile.REGTYPE)]+valid[1:], [('/escape',b'x',tarfile.REGTYPE)]+valid[1:]]
        for kind in [tarfile.SYMTYPE,tarfile.LNKTYPE,tarfile.FIFOTYPE,tarfile.DIRTYPE]: variants.append([(valid[0][0],b'',kind)]+valid[1:])
        for entries in variants:
            with self.subTest(entries=entries):
                destination=self.root/'extracted'; destination.mkdir(exist_ok=True)
                with self.assertRaises(ValueError): importer.extract(self.archive(entries),destination)
                self.assertEqual(list(destination.iterdir()),[])
    def test_core_authority_rejects_changed_missing_and_extra_assets(self):
        folder=self.root/'extracted'; folder.mkdir(); importer.extract(self.root/self.lock['bundle_file'],folder)
        core_spec=importlib.util.spec_from_file_location('core',self.root/self.lock['verifier_file']); core=importlib.util.module_from_spec(core_spec); core_spec.loader.exec_module(core)
        def verify(): return core.verify(folder,expected_manifest_sha256=self.lock['manifest_sha256'],expected_revision=self.lock['source_revision'])
        self.assertEqual(verify(),[]); asset=folder/'cast/index.html'; original=asset.read_bytes()
        asset.write_bytes(original+b'changed'); self.assertTrue(verify()); asset.unlink(); self.assertTrue(verify()); asset.write_bytes(original)
        (folder/'extra').write_text('extra'); self.assertIn('unexpected_assets',verify())
    def test_unexpected_distribution_asset_and_symlink(self):
        extra=self.root/'wwwroot/functions.js'; extra.write_text('unexpected')
        with self.assertRaises(ValueError): self.adopt()
        extra.unlink(); page=self.root/'wwwroot/index.html'; page.unlink(); page.symlink_to(self.root/'target')
        with self.assertRaises(ValueError): self.adopt()
        self.assertFalse((self.root/'target').exists())
    def test_lock_paths_cannot_escape_checkout(self):
        for value in ['/tmp/external','../external']:
            self.lock['verifier_file']=value; self.write_lock()
            with self.assertRaises(ValueError): self.adopt()

class HistoricalRollbackTest(unittest.TestCase):
    def test_old_pin_and_verifier_restore_exact_legacy_build_then_new_pin_restores_candidate(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp).resolve()
            shutil.copytree(ROOT/'vendor',root/'vendor')
            shutil.copytree(ROOT/'wwwroot',root/'wwwroot')
            old=ROOT/'vibecast-source-lock-1.0.0.json'
            importer.adopt(old,root=root)
            page=root/'wwwroot/index.html'
            self.assertEqual(importer.sha256(page.read_bytes()),'060b6f140a766e218593d0574949cdc8a5cd74cdca21483565cf5cd8dc152701')
            self.assertEqual(importer.sha256((root/'wwwroot/vibecast-manifest.json').read_bytes()),'72239b476e793fe5bb5493d2be5720fcd1f6e64ea83e012c77573732a58c7898')
            importer.adopt(ROOT/'vibecast-source-lock.json',root=root)
            self.assertEqual(page.read_bytes(),(ROOT/'wwwroot/index.html').read_bytes())
            importer.adopt(ROOT/'vibecast-source-lock.json',root=root,check=True)

class ReadonlyRollbackTest(unittest.TestCase):
    def test_prior_status_pin_restores_exact_bytes_and_readonly_pin_reapplies(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve()
            shutil.copytree(ROOT / 'vendor', root / 'vendor')
            shutil.copytree(ROOT / 'wwwroot', root / 'wwwroot')
            importer.adopt(ROOT / 'vibecast-source-lock-1.1.0.json', root=root)
            page = root / 'wwwroot/index.html'
            self.assertEqual(importer.sha256(page.read_bytes()), 'cdd24ff51d0719d07d0929d7ab6c988df1b77e10b753f06028ad13b3caad9a14')
            self.assertIn(b'end-session', page.read_bytes())
            importer.adopt(ROOT / 'vibecast-source-lock.json', root=root)
            self.assertNotIn(b'end-session', page.read_bytes())
            self.assertEqual(page.read_bytes(), (ROOT / 'wwwroot/index.html').read_bytes())
            importer.adopt(ROOT / 'vibecast-source-lock.json', root=root, check=True)

class ImmediateReadonlyRollbackTest(unittest.TestCase):
    def test_restore_immediate_prior_cast_then_reapply_candidate_exactly(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp).resolve()
            shutil.copytree(ROOT/'vendor',root/'vendor')
            shutil.copytree(ROOT/'wwwroot',root/'wwwroot')
            importer.adopt(ROOT/'vibecast-source-lock-readonly-6a3adbc8.json',root=root)
            self.assertEqual(importer.sha256((root/'wwwroot/index.html').read_bytes()),'cf4421778d093e130b46866b98ca1ab72b142e5359a1a6d43ea082c1e79e9fab')
            self.assertEqual(importer.sha256((root/'wwwroot/vibecast-manifest.json').read_bytes()),'ee18b3d9f45341ae522d2406a087c009da48a67a99d7da3e1cbbdf483a5a09d2')
            importer.adopt(ROOT/'vibecast-source-lock.json',root=root)
            for name in ['index.html','vibecast-manifest.json','_headers']:
                self.assertEqual((root/'wwwroot'/name).read_bytes(),(ROOT/'wwwroot'/name).read_bytes())
            importer.adopt(ROOT/'vibecast-source-lock.json',root=root,check=True)

class LocalHostBoundaryTest(unittest.TestCase):
    def test_cast_adapter_unchanged_local_transport_preserved_and_shared_renderer(self):
        import runpy
        old=json.loads((ROOT/'vibecast-source-lock-1.0.0.json').read_text())
        new=json.loads((ROOT/'vibecast-source-lock.json').read_text())
        core=runpy.run_path(str(ROOT/new['verifier_file']))
        with tempfile.TemporaryDirectory() as temp:
            previous=Path(temp)/'old'; current=Path(temp)/'new'
            previous.mkdir(); current.mkdir()
            importer.extract(ROOT/old['bundle_file'],previous)
            importer.extract(ROOT/new['bundle_file'],current)
            scripts=[]
            for folder in [previous,current]:
                parser=core['InlineScripts']();parser.feed((folder/'local/vibecast.html').read_text());scripts.append(parser.scripts)
            # Core1.1.2 owns new localized onboarding DOM, retaining the local transport.
            import re
            for pattern in [r'  let stopped[\s\S]*?      panel.innerHTML', r'      panel.hidden = false;[\s\S]*']:
                self.assertEqual(re.search(pattern,scripts[0][1]).group(),re.search(pattern,scripts[1][1]).group())
            for old_folder,new_folder in [(previous,current)]:
                cast_scripts=[]
                prior=Path(temp)/'prior-readonly';prior.mkdir()
                rollback=json.loads((ROOT/'vibecast-source-lock-readonly-6a3adbc8.json').read_text())
                importer.extract(ROOT/rollback['bundle_file'],prior)
                for folder in [prior,new_folder]:
                    host_parser=core['InlineScripts']();host_parser.feed((folder/'cast/index.html').read_text());cast_scripts.append(host_parser.scripts[-1])
                self.assertEqual(cast_scripts[0],cast_scripts[1])
            self.assertNotIn('gstatic.com',(current/'local/vibecast.html').read_text())
            self.assertNotIn('DJC_VIBECAST_MODE = "cast"',scripts[1][0])
            parser=core['InlineScripts']();parser.feed((current/'cast/index.html').read_text())
            self.assertEqual(parser.scripts[0].removeprefix('window.DJC_VIBECAST_MODE = "cast";\n'),scripts[1][0])

if __name__=='__main__': unittest.main()
