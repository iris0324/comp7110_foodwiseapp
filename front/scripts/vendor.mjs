import {cp,mkdir} from 'node:fs/promises';
await mkdir('js/vendor',{recursive:true});
await cp('node_modules/jsqr/dist/jsQR.js','js/vendor/jsQR.js');
await cp('node_modules/jsqr/LICENSE','js/vendor/jsQR.LICENSE.txt');
