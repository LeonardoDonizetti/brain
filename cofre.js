/* Cofre do Brain: criptografia dos dados no aparelho.
   Senha -> PBKDF2-SHA256 (muitas voltas) -> chave AES-256-GCM. Os dados ficam cifrados no armazenamento;
   sem a senha não há como ler (nem o Brain consegue recuperar). Funciona no navegador e no Node (testes). */
(function (root) {
  'use strict';
  const VOLTAS = 310000;
  const cripto = () => (root.crypto && root.crypto.subtle ? root.crypto : (typeof globalThis !== 'undefined' ? globalThis.crypto : null));
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const paraB64 = (bytes) => {
    const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (typeof Buffer !== 'undefined') return Buffer.from(u).toString('base64');
    let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const deB64 = (b64) => {
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(String(b64), 'base64'));
    const s = atob(String(b64)); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u;
  };

  const disponivel = () => !!(cripto() && cripto().subtle);
  const novoSal = () => paraB64(cripto().getRandomValues(new Uint8Array(16)));
  const ehEnvelope = (o) => !!o && typeof o === 'object' && o.brain_cifrado === 1 && typeof o.s === 'string' && typeof o.i === 'string' && typeof o.d === 'string';

  /** Deriva a chave AES a partir da senha. */
  async function derivar(senha, salB64, voltas) {
    const s = cripto().subtle;
    const base = await s.importKey('raw', enc.encode(String(senha)), 'PBKDF2', false, ['deriveKey']);
    return s.deriveKey({ name: 'PBKDF2', salt: deB64(salB64), iterations: voltas || VOLTAS, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  }
  async function cifrar(chave, texto, salB64, voltas) {
    const iv = cripto().getRandomValues(new Uint8Array(12));
    const d = await cripto().subtle.encrypt({ name: 'AES-GCM', iv }, chave, enc.encode(texto));
    return { brain_cifrado: 1, v: 1, it: voltas || VOLTAS, s: salB64, i: paraB64(iv), d: paraB64(d) };
  }
  async function decifrar(chave, env) {
    try { return dec.decode(await cripto().subtle.decrypt({ name: 'AES-GCM', iv: deB64(env.i) }, chave, deB64(env.d))); }
    catch (e) { throw new Error('Senha incorreta.'); }
  }
  const exportarChave = async (chave) => paraB64(await cripto().subtle.exportKey('raw', chave));
  const importarChave = (b64) => cripto().subtle.importKey('raw', deB64(b64), { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);

  /** Avalia a senha: quanto ela aguenta contra tentativas em massa. */
  function forca(senha) {
    const s = String(senha || '');
    if (s.length < 4) return { nivel: 0, texto: 'Use pelo menos 4 caracteres.' };
    if (/^\d+$/.test(s)) return s.length >= 8 ? { nivel: 2, texto: 'PIN longo: bom.' } : { nivel: 1, texto: 'PIN numérico protege de curiosos. Para proteger de quem copiar os dados do aparelho, use 8+ dígitos ou uma senha com letras.' };
    return s.length >= 8 ? { nivel: 3, texto: 'Senha forte.' } : { nivel: 2, texto: 'Boa. Com 8+ caracteres fica ainda melhor.' };
  }

  const lib = { VOLTAS, disponivel, novoSal, ehEnvelope, derivar, cifrar, decifrar, exportarChave, importarChave, forca, paraB64, deB64 };
  root.BrainCofre = lib;
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
})(typeof self !== 'undefined' ? self : this);
