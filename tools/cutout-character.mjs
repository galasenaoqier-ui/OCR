import sharp from 'sharp'

const source = 'public/assets/digital-scholar-2d.png'
const target = 'public/assets/digital-scholar-cutout.png'
const width = 300
const height = 760
const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><path fill="white" d="M224 8 C180 28 148 70 140 128 L120 190 L84 234 L56 352 L20 450 L36 590 L16 770 L32 984 L14 1150 L52 1330 L120 1380 L164 1410 L416 1410 L470 1380 L520 1316 L540 1150 L516 972 L542 780 L520 600 L548 448 L504 334 L476 232 L430 190 L420 118 C404 52 372 22 340 8 Z"/></svg>`
const mask = await sharp(Buffer.from(maskSvg)).png().toBuffer()
await sharp(source)
  .resize({ width })
  .composite([{ input: mask, blend: 'dest-in' }])
  .png()
  .toFile(target)
console.log(`wrote ${target}`)
