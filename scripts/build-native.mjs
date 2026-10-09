import {mkdir,readFile,writeFile,copyFile,cp,readdir,access} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {build as bundle} from 'esbuild';
import {build as buildElectron,Platform,Arch} from 'electron-builder';
import sharp from 'sharp';
import {ROOT,buildCodeRelease,sha256} from './release-lib.mjs';
import {buildArtArchive} from './build-art-pack.mjs';

const target=process.argv[2]||'all';
if(!['windows','android','all','prepare-android'].includes(target))throw Error('Usage: build-native.mjs windows | android | all | prepare-android [--code-only]');
if(process.argv.includes('--with-art')&&process.argv.includes('--code-only'))throw Error('Choose --with-art or --code-only');
const withArt=process.argv.includes('--with-art');
const exists=async path=>{try{await access(path);return true;}catch{return false;}};
const packageInfo=JSON.parse(await readFile(join(ROOT,'package.json'),'utf8'));
const release=join(ROOT,'dist','native-'+Date.now()),stage=join(ROOT,'.local','native-build-'+Date.now());
await mkdir(stage,{recursive:true});await mkdir(release,{recursive:true});
const code=join(release,'code'),{manifest}=await buildCodeRelease(code);
if(withArt){const art=await buildArtArchive(join(release,'art','art.pack'));manifest.codeOnly=false;manifest.art={id:art.id,revision:art.revision,sha256:art.sha256,bytes:art.bytes};await writeFile(join(code,'release.json'),JSON.stringify(manifest,null,2)+'\n');}
const webFiles=[...Object.keys(manifest.files),'release.json','sw.js','licenses'];
async function copyWeb(out){await mkdir(out,{recursive:true});for(const path of webFiles)await cp(join(code,path),join(out,path),{recursive:true});}
const icon=await sharp(await readFile(join(ROOT,'icon.svg'))).resize(256,256).png().toBuffer();
await writeFile(join(stage,'icon.png'),icon);
const ico=Buffer.alloc(22+icon.length);ico.writeUInt16LE(1,2);ico.writeUInt16LE(1,4);ico.writeUInt16LE(1,10);ico.writeUInt16LE(32,12);ico.writeUInt32LE(icon.length,14);ico.writeUInt32LE(22,18);ico.set(icon,22);await writeFile(join(stage,'icon.ico'),ico);
const artifacts={};

async function windows(){
 if(process.platform!=='win32')throw Error('Build the Windows EXE on Windows');
 if(!await exists(join(ROOT,'node_modules/electron/dist/electron.exe')))await run(process.execPath,[join(ROOT,'node_modules/electron/install.js')]);
 const appDir=join(stage,'desktop');await copyWeb(join(appDir,'code'));await copyFile(join(stage,'icon.png'),join(appDir,'icon.png'));
 await bundle({entryPoints:[join(ROOT,'packaging/desktop.mjs')],outfile:join(appDir,'main.cjs'),platform:'node',format:'cjs',bundle:true,minify:true,
  external:['electron'],target:'node22',legalComments:'external'});
 await copyFile(join(ROOT,'packaging/preload.cjs'),join(appDir,'preload.cjs'));
 await writeFile(join(appDir,'package.json'),JSON.stringify({name:'sango-sovereign-desktop',version:packageInfo.version,private:true,
  description:'三国 · 君临离线试玩版',author:'Sango',main:'main.cjs'},null,2));
 const filename='sango-'+packageInfo.version+'-windows.exe';
 await buildElectron({targets:Platform.WINDOWS.createTarget(['portable'],Arch.x64),config:{appId:'com.sango.sovereign',productName:'三国 · 君临',
  electronVersion:packageInfo.devDependencies.electron,electronDist:join(ROOT,'node_modules/electron/dist'),directories:{app:appDir,output:release},asar:true,
  files:['main.cjs','main.cjs.LEGAL.txt','preload.cjs','package.json','icon.png','code/**/*'],
  extraResources:withArt?[{from:join(release,'art'),to:'art'}]:[],
  win:{icon:join(stage,'icon.ico'),executableName:'SangoSovereign',target:'portable'},portable:{artifactName:filename},
  npmRebuild:false,compression:'normal',forceCodeSigning:false}});
 const bytes=await readFile(join(release,filename));artifacts.windows={file:filename,bytes:bytes.length,sha256:sha256(bytes),arch:'x64',signed:false};
}

async function androidTools(){
 const tools=join(ROOT,'.local','native-tools');
 let javaHome=process.env.JAVA_HOME;
 if(!javaHome){const local=join(tools,'jdk');if(await exists(local)){const entries=await readdir(local,{withFileTypes:true});javaHome=join(local,entries.find(entry=>entry.isDirectory()&&entry.name.startsWith('jdk'))?.name||'');}}
 javaHome||=join(process.env.ProgramFiles||'C:\\Program Files','Android','Android Studio','jbr');
 const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT||join(tools,'sdk');
 if(!await exists(join(javaHome,'bin','javac.exe'))||!await exists(join(sdk,'platforms','android-36','android.jar')))throw Error('Android requires JDK 21+, SDK platform 36 and build-tools 36.0.0. Set JAVA_HOME / ANDROID_HOME or install them in .local/native-tools.');
 return {javaHome,sdk};
}
function run(file,args,options={}){
 return new Promise((ok,fail)=>{
  const child=spawn(file,args,{cwd:ROOT,env:process.env,windowsHide:true,stdio:'inherit',...options});
  child.once('error',fail);child.once('exit',code=>code===0?ok():fail(Error(dirname(file)+' process exited with '+code)));
 });
}
async function android(){
 const mobile=join(stage,'mobile');await copyWeb(join(mobile,'www'));
 if(withArt)await copyFile(join(release,'art','art.pack'),join(mobile,'www','art.pack'));
 const dependencies=Object.fromEntries(Object.entries(packageInfo.devDependencies).filter(([name])=>name.startsWith('@capacitor/')&&name!=='@capacitor/cli'));
 await writeFile(join(mobile,'package.json'),JSON.stringify({name:'sango-sovereign-android',version:packageInfo.version,private:true,dependencies},null,2));
 await writeFile(join(mobile,'capacitor.config.json'),JSON.stringify({appId:'com.sango.sovereign',appName:'三国 · 君临',webDir:'www',
  server:{hostname:'localhost',androidScheme:'https'},android:{allowMixedContent:false,adjustMarginsForEdgeToEdge:'auto',minWebViewVersion:120,webContentsDebuggingEnabled:false}},null,2));
 const cap=join(ROOT,'node_modules','@capacitor','cli','bin','capacitor');
 await run(process.execPath,[cap,'add','android'],{cwd:mobile});
 const project=join(mobile,'android');
 const wrapperPath=join(project,'gradle/wrapper/gradle-wrapper.properties');
 const wrapper=(await readFile(wrapperPath,'utf8')).replace('services.gradle.org','downloads.gradle.org').replace('-all.zip','-bin.zip').replace('networkTimeout=10000','networkTimeout=120000');
 const distribution=wrapper.match(/distributionUrl=(.+)/)?.[1].replaceAll('\\:',':');
 const checksumResponse=await fetch(distribution+'.sha256',{signal:AbortSignal.timeout(30000)});
 if(!checksumResponse.ok)throw Error('Could not obtain the official Gradle checksum');
 const checksum=(await checksumResponse.text()).trim();if(!/^[a-f0-9]{64}$/.test(checksum))throw Error('Invalid Gradle checksum');
 const cachedGradle=join(ROOT,'.local/native-tools',distribution.split('/').at(-1));
 let configuredWrapper=wrapper;
 if(await exists(cachedGradle)){
  if(sha256(await readFile(cachedGradle))!==checksum)throw Error('Cached Gradle checksum mismatch');
  configuredWrapper=wrapper.replace(/distributionUrl=.+/, 'distributionUrl='+pathToFileURL(cachedGradle).href.replaceAll(':','\\:'));
 }
 await writeFile(wrapperPath,configuredWrapper+'\ndistributionSha256Sum='+checksum+'\n');
 await copyFile(join(ROOT,'packaging/android/MainActivity.java'),join(project,'app/src/main/java/com/sango/sovereign/MainActivity.java'));
 let gradle=await readFile(join(project,'app/build.gradle'),'utf8');
 const [major,minor,patch]=packageInfo.version.split('.').map(Number),versionCode=major*1000000+minor*1000+patch;
 gradle=gradle.replace(/versionCode \d+/,`versionCode ${Math.max(1,versionCode)}`).replace(/versionName "[^"]+"/,`versionName "${packageInfo.version}"`);
 await writeFile(join(project,'app/build.gradle'),gradle);
 const variables=await readFile(join(project,'variables.gradle'),'utf8');await writeFile(join(project,'variables.gradle'),variables.replace(/minSdkVersion = \d+/,'minSdkVersion = 26'));
 const res=join(project,'app/src/main/res');
 for(const density of ['mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi']){
  const size={mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192}[density],out=join(res,'mipmap-'+density);await mkdir(out,{recursive:true});
  for(const name of ['ic_launcher.png','ic_launcher_round.png','ic_launcher_foreground.png'])await sharp(icon).resize(size,size).png().toFile(join(out,name));
 }
 const any=join(res,'mipmap-anydpi-v26');await mkdir(any,{recursive:true});
 for(const name of ['ic_launcher.xml','ic_launcher_round.xml'])await writeFile(join(any,name),'<?xml version="1.0" encoding="utf-8"?><adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ic_launcher_background"/><foreground android:drawable="@mipmap/ic_launcher_foreground"/></adaptive-icon>');
 await run(process.execPath,[cap,'sync','android'],{cwd:mobile});
 await writeFile(join(release,'android-project.txt'),project+'\n');
 if(target==='prepare-android'){console.log('Android project: '+project);return;}
 const {javaHome,sdk}=await androidTools();
 const environment={...process.env,JAVA_HOME:javaHome,ANDROID_HOME:sdk,ANDROID_SDK_ROOT:sdk,
  GRADLE_USER_HOME:join(ROOT,'.local','gradle'),JAVA_TOOL_OPTIONS:'-Djava.net.preferIPv4Stack=true -Djava.net.useSystemProxies=true',PATH:join(javaHome,'bin')+';'+process.env.PATH};
 const proxyFile=join(ROOT,'.local/native-tools/java-proxy.json');
 if(await exists(proxyFile)){
  const proxy=JSON.parse((await readFile(proxyFile,'utf8')).replace(/^\uFEFF/,''));
  for(const type of ['http','https'])if(proxy[type]&&/^[A-Za-z0-9.-]+$/.test(proxy[type].hostname)&&Number.isInteger(proxy[type].port))environment.JAVA_TOOL_OPTIONS+=` -D${type}.proxyHost=${proxy[type].hostname} -D${type}.proxyPort=${proxy[type].port}`;
  environment.JAVA_TOOL_OPTIONS+=' -Dhttp.nonProxyHosts=localhost|127.*';
 }
 await writeFile(join(project,'local.properties'),'sdk.dir='+sdk.replaceAll('\\','/')+'\n');
 const signingDir=join(ROOT,'.local','signing');await mkdir(signingDir,{recursive:true});
 const secretFile=join(signingDir,'android.json'),key=join(signingDir,'sango-android.p12');let secret;
 if(await exists(secretFile)){secret=JSON.parse(await readFile(secretFile,'utf8'));if(!await exists(key))throw Error('Android signing key is missing; restore the original key before updating the application.');}
 else{
  if(await exists(key))throw Error('Android key exists without its password record; restore android.json instead of replacing the key.');
  secret={alias:'sango',password:randomBytes(32).toString('hex')};
  environment.SANGO_SIGNING_PASSWORD=secret.password;
  await run(join(javaHome,'bin','keytool.exe'),['-genkeypair','-keystore',key,'-storetype','PKCS12','-alias',secret.alias,'-keyalg','RSA','-keysize','3072','-validity','10000',
   '-dname','CN=Sango Playtest','-storepass:env','SANGO_SIGNING_PASSWORD','-keypass:env','SANGO_SIGNING_PASSWORD'],{env:environment});
  await writeFile(secretFile,JSON.stringify(secret,null,2)+'\n',{mode:0o600});
 }
 const properties=join(project,'sango-signing.properties');
 await writeFile(properties,'storeFile='+key.replaceAll('\\','/')+'\nstorePassword='+secret.password+'\nkeyAlias='+secret.alias+'\nkeyPassword='+secret.password+'\n',{mode:0o600});
 await writeFile(join(project,'app/build.gradle'),gradle+`\ndef signingProps = new Properties()\nsigningProps.load(new FileInputStream(rootProject.file('sango-signing.properties')))\nandroid { signingConfigs { playtest { storeFile file(signingProps['storeFile']); storePassword signingProps['storePassword']; keyAlias signingProps['keyAlias']; keyPassword signingProps['keyPassword'] } }; buildTypes { release { signingConfig signingConfigs.playtest } } }\n`);
 await run(process.env.ComSpec||'cmd.exe',['/d','/c','gradlew.bat','--no-daemon','assembleRelease'],{cwd:project,env:environment});
 const filename='sango-'+packageInfo.version+'-android.apk';await copyFile(join(project,'app/build/outputs/apk/release/app-release.apk'),join(release,filename));
 await run(process.env.ComSpec||'cmd.exe',['/d','/c',join(sdk,'build-tools','36.0.0','apksigner.bat'),'verify','--verbose',join(release,filename)],{env:environment});
 const bytes=await readFile(join(release,filename));artifacts.android={file:filename,bytes:bytes.length,sha256:sha256(bytes),minSdk:26,signed:true};
}

if(target==='windows'||target==='all')await windows();
if(target==='android'||target==='all'||target==='prepare-android')await android();
await writeFile(join(release,'native-release.json'),JSON.stringify({formatVersion:1,gameVersion:manifest.gameVersion,rulesVersion:manifest.rulesVersion,
 revision:manifest.revision,codeOnly:!withArt,artifacts},null,2)+'\n');
await writeFile(join(release,'试玩说明.txt'),'三国 · 君临 '+manifest.gameVersion+'\nWindows：双击 EXE，无需安装 Node.js。F11 切换全屏。此试玩版未做 Windows 发布者签名。\nAndroid：安装 APK 后从桌面图标启动；支持 Android 8.0 以上，需要系统 WebView 120 或更新版本。\n首次启动和游玩均无需联网。存档保存在本机应用中，可在设置导出与导入 JSON。替换 EXE 或使用相同签名覆盖安装 APK 会保留应用数据；卸载 Android 应用会删除本机存档。规则变化导致存档不兼容时须重新开始。\n此包默认使用姓名与内置地图图形，不含独立美术目录或生产记录。\nAPK 已完成编译及签名校验，设备上的运行情况须另行实测。\n');
console.log('Native release: '+release);
