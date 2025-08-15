
# 10-Person WebRTC (Mesh) — Render-ready

Энэ төсөл нь 10 хүртэл хүн видео/аудио дуудлага хийх энгийн WebRTC **mesh** апп юм.
Socket.io ашигласан signaling сервертэй бөгөөд **Render Web Service** дээр шууд байршуулж ажиллана.

## Байршуулах

1) Энэ бүх файлыг GitHub шинэ репод хуулна (эсвэл ZIP-ийг задлаад upload).  
2) Render.com → **New → Web Service**  
   - Environment: **Node**  
   - Build Command: `npm install`  
   - Start Command: `node server.js`  
   - Instance: **Free**  
3) Deploy дууссаны дараа гарсан URL-аа нээгээд, яг ижил **Room ID**-оор 2–10 төхөөрөмж Join хийнэ.

## TURN сервер (шаардлагатай тохиолдолд)
NAT ард, сул сүлжээнд холболт бүткүй бол `public/script.js` доторх `RTCPeerConnection`-ийн `iceServers`-т өөрийн TURN серверийг нэмнэ.

## Анхаарах
- Mesh загвар тул 10 хүнээс цааш, эсвэл сул сүлжээнд ачаалалтай байж болно. Том өрөө хэрэгтэй бол LiveKit/mediasoup зэрэг SFU руу шилжихийг зөвлөе.
