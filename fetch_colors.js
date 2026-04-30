import https from 'https';

https.get('https://cdn.prod.website-files.com/68e26a5b53e6344f24d9f861/css/croustygame.webflow.shared.ce045fb36.css', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const colors = data.match(/#[0-9a-fA-F]{3,6}/g);
    const uniqueColors = [...new Set(colors)];
    console.log(uniqueColors);
  });
});
