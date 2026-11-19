"""Import a pinned Core release, without network, rendering or deployment."""

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import subprocess
import sys
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parents[1]
ASSETS = {"cast/index.html", "local/vibecast.html", "manifest.json"}
MAX_FILE_SIZE = 1024 * 1024


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def extract(archive, destination):
    """Validate the entire archive before writing any member. Never extract links."""
    with tarfile.open(archive, "r:gz") as bundle:
        members = bundle.getmembers()
        names = [member.name for member in members]
        if len(names) != len(ASSETS) or set(names) != ASSETS:
            raise ValueError("missing, duplicate or unexpected archive member")
        for member in members:
            name = PurePosixPath(member.name)
            if (not member.isfile() or member.issym() or member.islnk()
                    or name.is_absolute() or ".." in name.parts
                    or member.size < 0 or member.size > MAX_FILE_SIZE):
                raise ValueError("unsafe archive member")
        for member in members:
            target = destination / member.name
            target.parent.mkdir(parents=True, exist_ok=True)
            with bundle.extractfile(member) as source:
                target.write_bytes(source.read())


def adopt(lock_path, *, bundle_path=None, check=False, root=ROOT):
    lock = json.loads(lock_path.read_bytes())
    if lock.get("schema_version") != 1:
        raise ValueError("unsupported source lock")
    # Repository paths may not escape the checkout or follow symlinks.
    def repository_file(key):
        relative = PurePosixPath(lock[key])
        if relative.is_absolute() or ".." in relative.parts:
            raise ValueError("unsafe source lock path")
        path = root / relative
        if any(part.is_symlink() for part in [path, *path.parents]):
            raise ValueError("symlink in source lock path")
        return path

    verifier = repository_file("verifier_file")
    if sha256(verifier.read_bytes()) != lock["verifier_sha256"]:
        raise ValueError("untrusted Core verifier")
    archive = bundle_path if bundle_path is not None else repository_file("bundle_file")
    if sha256(archive.read_bytes()) != lock["bundle_sha256"]:
        raise ValueError("untrusted bundle digest")
    with tempfile.TemporaryDirectory(prefix="djc-cast-import-") as directory:
        extracted = Path(directory)
        extract(archive, extracted)
        # The unchanged supplying Core verifier remains asset/contract authority.
        subprocess.run([
            sys.executable, str(verifier), "--verify-existing", "--output", str(extracted),
            "--revision", lock["source_revision"],
            "--expected-manifest-sha256", lock["manifest_sha256"],
        ], check=True, capture_output=True, text=True)
        manifest = json.loads((extracted / "manifest.json").read_bytes())
        if manifest["renderer_source_sha256"] != lock["renderer_sha256"]:
            raise ValueError("wrong shared renderer pin")
        outputs = {
            "index.html": (extracted / "cast/index.html").read_bytes(),
            "vibecast-manifest.json": (extracted / "manifest.json").read_bytes(),
        }
        webroot = root / "wwwroot"
        if webroot.is_symlink() or not webroot.is_dir():
            raise ValueError("unsafe distribution directory")
        if {p.name for p in webroot.iterdir()} - set(outputs) - {"_headers"}:
            raise ValueError("unexpected distribution asset")
        for name, data in outputs.items():
            path = webroot / name
            if path.is_symlink() or (path.exists() and not path.is_file()):
                raise ValueError("unsafe distribution asset")
            if check and (not path.is_file() or path.read_bytes() != data):
                raise ValueError("generated distribution drift: " + name)
        if not check:
            for name, data in outputs.items():
                (webroot / name).write_bytes(data)
    return {"source_revision": lock["source_revision"], "manifest_sha256": lock["manifest_sha256"],
            "verification": "PASS", "mode": "check" if check else "import"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lock", type=Path, default=ROOT / "vibecast-source-lock.json")
    parser.add_argument("--bundle", type=Path)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    try:
        print(json.dumps(adopt(args.lock, bundle_path=args.bundle, check=args.check), sort_keys=True))
    except (ValueError, OSError, KeyError, tarfile.TarError, subprocess.CalledProcessError) as error:
        # Do not log archive contents, subprocess output or runtime data.
        raise SystemExit("VibeCast import rejected: " + type(error).__name__) from None


if __name__ == "__main__":
    main()
