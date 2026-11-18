// Consumer of the fixed API wire; no service, storage or sender authentication.
import {definitions} from './wire-schema.mjs';
export const WIRE='djc-rendezvous/1', ORIGIN='https://vibecast.tv', SERVICE='https://api.djconnect.dev';
export function need(value){if(!value) throw new Error('rendezvous_rejected');}
export function encode(bytes){return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');}
export function decode(value,min,max=min){need(typeof value==='string'&&value.length<=Math.ceil(max*4/3)&&/^[A-Za-z0-9_-]+$/.test(value));let bytes;try{bytes=Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));}catch{need(false);}need(bytes.length>=min&&bytes.length<=max&&encode(bytes)===value);return bytes;}
export function closed(value,fields){need(value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...fields].sort().join(','));return value;}
// Decode UTF8 and duplicate *decoded* names before object assignment. Bounded,
// recursive JSON grammar; schema validation separately forbids unknown fields.
export function strictJSON(bytes,max=16384){
 need(bytes instanceof Uint8Array&&bytes.length>0&&bytes.length<=max);
 const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);let i=0;
 const space=()=>{while(i<text.length&&/[ \t\r\n]/.test(text[i]))i++;};
 const string=()=>{space();need(text[i]==='"');const start=i++;while(i<text.length){const c=text[i++];if(c==='"')return JSON.parse(text.slice(start,i));if(c==='\\')i++;}need(false);};
 function value(depth=0){need(depth<=8);space();const c=text[i];
  if(c==='"')return string();
  if(c==='{'){i++;const obj=Object.create(null),names=new Set();space();if(text[i]==='}'){i++;return obj;}for(;;){const k=string();need(!names.has(k)&&names.size<64);names.add(k);space();need(text[i++]===':');obj[k]=value(depth+1);space();if(text[i]==='}'){i++;return obj;}need(text[i++]===',');}}
  if(c==='['){i++;const a=[];space();if(text[i]===']'){i++;return a;}for(;;){need(a.length<64);a.push(value(depth+1));space();if(text[i]===']'){i++;return a;}need(text[i++ ]===',');}}
  for(const [t,v] of [['true',true],['false',false],['null',null]])if(text.startsWith(t,i)){i+=t.length;return v;}
  const match=/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(text.slice(i));need(match);i+=match[0].length;const n=Number(match[0]);need(Number.isSafeInteger(n)&&!Object.is(n,-0));return n;
 }
 const result=value();space();need(i===text.length);return result;
}
export function schema(name,value){
 function check(s,v){if(s.$ref)return check(definitions[s.$ref.split('/').at(-1)],v);if(Object.hasOwn(s,'const')&&v!==s.const)return false;if(s.enum&&!s.enum.includes(v))return false;
  if(s.type==='object'){if(v===null||typeof v!=='object'||Array.isArray(v))return false;if(s.required?.some(k=>!Object.hasOwn(v,k)))return false;for(const k of Object.keys(v)){if(!Object.hasOwn(s.properties,k))return false;if(!check(s.properties[k],v[k]))return false;}}
  if(s.type==='string'&&(typeof v!=='string'||s.maxLength!==undefined&&v.length>s.maxLength||s.minLength!==undefined&&v.length<s.minLength||s.pattern&&!new RegExp(s.pattern).test(v)))return false;
  if(s.type==='integer'&&(!Number.isSafeInteger(v)||v<(s.minimum??-Infinity)||v>(s.maximum??Infinity)))return false;
  return true;
 }
 need(check(definitions[name],value));return value;
}
// Exact Core lexical policy BEFORE WHATWG normalization (no implicit owner proof).
export function displayURL(raw){
 need(typeof raw==='string'&&raw.length<=512);const match=/^https:\/\/([a-z0-9.-]+)\/djconnect\/vibecast\/display$/.exec(raw);need(match);
 const host=match[1],labels=host.split('.'),reserved=new Set(['local','localhost','internal','invalid','test','example','lan','home','onion','arpa']);
 need(host.length<=253&&labels.length>=2&&!reserved.has(labels.at(-1))&&/^[a-z]{2,63}$/.test(labels.at(-1)));
 need(labels.every(s=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(s)&&!s.startsWith('xn--')));
 const url=new URL(raw);need(url.href===raw&&url.origin==='https://'+host);return raw;
}
