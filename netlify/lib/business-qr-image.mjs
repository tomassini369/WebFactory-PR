import QRCode from 'qrcode'
import sharp from 'sharp'

// Generate privately on the function; no tenant URL or logo leaves this server.
export async function renderBusinessQr({target, ink = '0b1529', logo = ''}) {
  const png = await QRCode.toBuffer(target, {type:'png', width:900, margin:4,
    errorCorrectionLevel:logo?'H':'Q', color:{dark:`#${ink}`, light:'#ffffff'}})
  if (!logo) return png
  try {
    const bytes = Buffer.from(logo.split(',')[1], 'base64')
    const image = await sharp(bytes).resize(156,156,{fit:'contain',background:'#ffffff'}).flatten({background:'#ffffff'}).png().toBuffer()
    const plate = await sharp({create:{width:180,height:180,channels:4,background:'#ffffff'}}).composite([{input:image,left:12,top:12}]).png().toBuffer()
    return await sharp(png).composite([{input:plate,left:360,top:360}]).png().toBuffer()
  } catch { return png } // Optional damaged branding must not hide the QR.
}
