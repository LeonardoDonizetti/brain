#!/usr/bin/env python3
"""Ajusta o projeto Android gerado pelo Capacitor: ícones, splash, segurança do manifesto e assinatura.
Uso: python3 apk/preparar.py apk/android .   (roda no GitHub Actions)"""
import os, re, sys
from PIL import Image, ImageDraw

android, raiz = sys.argv[1], sys.argv[2]
res = os.path.join(android, 'app/src/main/res')
app = os.path.join(android, 'app')

# ---- manifesto: sem backup do Android (os dados são cifrados pelo próprio Brain), sem tráfego sem HTTPS ----
mf = os.path.join(app, 'src/main/AndroidManifest.xml')
s = open(mf, encoding='utf-8').read()
s = s.replace('android:allowBackup="true"', 'android:allowBackup="false"\n        android:usesCleartextTraffic="false"')
# lembretes: alarmes exatos (USE_EXACT_ALARM é concedida sozinha no Android 13+; SCHEDULE_EXACT_ALARM cobre o 12) para o aviso sair na hora marcada
perm = ('    <uses-permission android:name="android.permission.USE_EXACT_ALARM" />\n'
        '    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" android:maxSdkVersion="32" />\n'
        '    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n'
        '    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />\n')
if 'USE_EXACT_ALARM' not in s:
    s = s.replace('<application', perm + '    <application', 1)
open(mf, 'w', encoding='utf-8').write(s)

# ---- versão e assinatura ----
bg = os.path.join(app, 'build.gradle')
g = open(bg, encoding='utf-8').read()
g = re.sub(r'versionCode \d+', 'versionCode ' + os.environ.get('GITHUB_RUN_NUMBER', '1'), g)
g = re.sub(r'versionName "[^"]*"', 'versionName "1.' + os.environ.get('GITHUB_RUN_NUMBER', '0') + '"', g)
assinatura = '''    signingConfigs {
        release {
            storeFile file(System.getenv('KS_PATH'))
            storePassword System.getenv('KS_PASS')
            keyAlias 'brain'
            keyPassword System.getenv('KS_PASS')
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release'''
assert '    buildTypes {\n        release {' in g
g = g.replace('    buildTypes {\n        release {', assinatura, 1)
open(bg, 'w', encoding='utf-8').write(g)

# ---- ícones ----
normal = Image.open(os.path.join(raiz, 'icon-512.png')).convert('RGBA')
mask = Image.open(os.path.join(raiz, 'icon-maskable-512.png')).convert('RGBA')
cor = (0x25, 0x73, 0xe6, 255)  # azul médio do degradê do ícone
hexcor = '#%02x%02x%02x' % cor[:3]
dens = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for nome, f in dens.items():
    pasta = os.path.join(res, 'mipmap-' + nome)
    t = int(48 * f)
    legado = mask.resize((t, t), Image.LANCZOS)
    legado.save(os.path.join(pasta, 'ic_launcher.png'))
    redondo = Image.new('RGBA', (t, t), (0, 0, 0, 0))
    m = Image.new('L', (t * 4, t * 4), 0); ImageDraw.Draw(m).ellipse((0, 0, t * 4 - 1, t * 4 - 1), fill=255)
    redondo.paste(legado, (0, 0), m.resize((t, t), Image.LANCZOS))
    redondo.save(os.path.join(pasta, 'ic_launcher_round.png'))
    c = int(108 * f)
    fg = os.path.join(raiz, 'icon-foreground.png')
    if os.path.exists(fg):
        # arte própria só do cérebro (transparente, dentro da zona segura do ícone adaptativo)
        Image.open(fg).convert('RGBA').resize((c, c), Image.LANCZOS).save(os.path.join(pasta, 'ic_launcher_foreground.png'))
    else:
        tela = Image.new('RGBA', (c, c), (0, 0, 0, 0))
        lado = int(c * 0.62)
        tela.paste(normal.resize((lado, lado), Image.LANCZOS), ((c - lado) // 2, (c - lado) // 2), normal.resize((lado, lado), Image.LANCZOS))
        tela.save(os.path.join(pasta, 'ic_launcher_foreground.png'))
fundo = os.path.join(res, 'values/ic_launcher_background.xml')
t = open(fundo, encoding='utf-8').read().replace('#FFFFFF', hexcor)
open(fundo, 'w', encoding='utf-8').write(t)

# ---- ícone pequeno das notificações: silhueta branca do cérebro (o Android pinta só o que não é transparente) ----
fgp = os.path.join(raiz, 'icon-foreground.png')
if os.path.exists(fgp):
    base = Image.open(fgp).convert('RGBA')
    alfa = base.split()[3]
    for nome, f in {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}.items():
        pasta = os.path.join(res, 'drawable-' + nome); os.makedirs(pasta, exist_ok=True)
        t = int(24 * f)
        caixa = alfa.getbbox() or (0, 0, alfa.size[0], alfa.size[1])
        rec = alfa.crop(caixa); rec.thumbnail((t, t), Image.LANCZOS)
        a = Image.new('L', (t, t), 0); a.paste(rec, ((t - rec.size[0]) // 2, (t - rec.size[1]) // 2))
        branco = Image.new('RGBA', (t, t), (255, 255, 255, 0)); branco.putalpha(a)
        branco.save(os.path.join(pasta, 'ic_stat_brain.png'))

# ---- splash: fundo liso na cor do app ----
for raizd, _, arqs in os.walk(res):
    for a in arqs:
        if a == 'splash.png':
            p = os.path.join(raizd, a)
            w, h = Image.open(p).size
            Image.new('RGB', (w, h), (0xfa, 0xf6, 0xee)).save(p)
print('projeto Android preparado; cor do ícone', hexcor)
