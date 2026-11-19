export const fruitColors = [0xff6567, 0xffd060, 0x80e1a4];

export function paintFruit(ctx: CanvasRenderingContext2D, kind: number) {
  ctx.clearRect(0, 0, 256, 256);
  ctx.save();
  ctx.translate(128, 139);
  ctx.beginPath();
  if (kind === 0) {
    ctx.moveTo(0, -72);
    ctx.bezierCurveTo(-65, -108, -116, -42, -81, 27);
    ctx.bezierCurveTo(-50, 101, -21, 99, 0, 83);
    ctx.bezierCurveTo(29, 101, 66, 87, 86, 23);
    ctx.bezierCurveTo(112, -50, 57, -103, 0, -72);
  } else ctx.ellipse(0, 0, kind === 2 ? 94 : 91, kind === 2 ? 88 : 91, -0.12, 0, Math.PI * 2);
  const gradient = ctx.createRadialGradient(-30, -37, 5, 15, 20, 125);
  const palettes = [
    ['#ffb08b', '#f7585d', '#9d283e'],
    ['#fff0a3', '#ffb83e', '#cc7221'],
    ['#c6f09a', '#50b783', '#1c705d'],
  ];
  gradient.addColorStop(0, palettes[kind][0]);
  gradient.addColorStop(0.5, palettes[kind][1]);
  gradient.addColorStop(1, palettes[kind][2]);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.save();
  ctx.clip();
  if (kind === 2) {
    ctx.strokeStyle = '#1f8162';
    ctx.lineWidth = 13;
    for (let x = -110; x < 120; x += 37) {
      ctx.beginPath();
      ctx.moveTo(x, -110);
      ctx.bezierCurveTo(x - 22, -40, x + 21, 30, x + 10, 110);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = kind === 0 ? '#ffd0a9' : '#fff1ad';
    for (let i = 0; i < 35; i++) {
      const x = Math.sin(i * 19.2) * 82,
        y = Math.cos(i * 7.3) * 78;
      ctx.globalAlpha = 0.16;
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.ellipse(-35, -37, 19, 35, 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#713f2f';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -76);
  ctx.quadraticCurveTo(-4, -95, 11, -111);
  ctx.stroke();
  ctx.fillStyle = '#79c677';
  ctx.beginPath();
  ctx.moveTo(5, -93);
  ctx.bezierCurveTo(26, -130, 68, -108, 63, -101);
  ctx.bezierCurveTo(43, -80, 23, -79, 5, -93);
  ctx.fill();
  ctx.strokeStyle = '#3c8859';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(8, -93);
  ctx.lineTo(55, -103);
  ctx.stroke();
  ctx.restore();
}

export function paintOrchard(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#83b6ae');
  sky.addColorStop(0.48, '#9fc8b2');
  sky.addColorStop(1, '#cee0b1');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * 0.76, h * 0.28, 0, w * 0.76, h * 0.28, w * 0.5);
  glow.addColorStop(0, '#d4dda329');
  glow.addColorStop(1, '#d4dda300');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#e6e3b2';
  ctx.globalAlpha = 0.65;
  ctx.beginPath();
  ctx.arc(w * 0.81, h * 0.23, Math.min(65, w * 0.08), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  for (let layer = 0; layer < 3; layer++) {
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * (0.6 + layer * 0.06));
    for (let x = 0; x <= w + 100; x += 90)
      ctx.lineTo(x, h * (0.57 + layer * 0.08) + Math.sin(x * 0.008 + layer * 3) * h * 0.08);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = ['#89ad88', '#6f9a7a', '#59856d'][layer];
    ctx.fill();
  }
  // A wooden practice deck gives the arena a tangible foreground and perspective.
  const floor = h * 0.87;
  const wood = ctx.createLinearGradient(0, floor, 0, h);
  wood.addColorStop(0, '#6f5742');
  wood.addColorStop(1, '#2d302d');
  ctx.fillStyle = wood;
  ctx.fillRect(0, floor, w, h - floor);
  ctx.strokeStyle = '#dec39530';
  ctx.lineWidth = 2;
  for (let i = -6; i <= 10; i++) {
    ctx.beginPath();
    ctx.moveTo(w / 2 + i * 42, floor);
    ctx.lineTo(w / 2 + (i * w) / 6, h);
    ctx.stroke();
  }
  for (const ratio of [0.89, 0.93, 0.99]) {
    ctx.beginPath();
    ctx.moveTo(0, h * ratio);
    ctx.lineTo(w, h * ratio);
    ctx.stroke();
  }
  ctx.fillStyle = '#112f2d';
  ctx.fillRect(0, floor - 9, w, 10);
  // Timber frame, roof tiles, hanging lamps and leaves belong to the game world.
  const postWidth = Math.max(13, w * 0.022);
  for (const x of [w * 0.028, w * 0.972 - postWidth]) {
    const post = ctx.createLinearGradient(x, 0, x + postWidth, 0);
    post.addColorStop(0, '#493931');
    post.addColorStop(0.5, '#9b704c');
    post.addColorStop(1, '#41362e');
    ctx.fillStyle = post;
    ctx.fillRect(x, 0, postWidth, floor);
    ctx.fillStyle = '#d8bd78';
    ctx.fillRect(x - 3, h * 0.13, postWidth + 6, 5);
    ctx.fillRect(x - 3, floor - 45, postWidth + 6, 5);
  }
  ctx.fillStyle = '#183e3c';
  ctx.fillRect(0, 0, w, 31);
  ctx.fillStyle = '#d2b879';
  ctx.fillRect(0, 30, w, 3);
  for (let x = -15; x < w; x += 43) {
    ctx.fillStyle = x % 2 ? '#28534a' : '#234b45';
    ctx.beginPath();
    ctx.roundRect(x, 0, 40, 24, [0, 0, 14, 14]);
    ctx.fill();
  }
  for (const x of [w * 0.105, w * 0.895]) {
    const y = h * 0.2;
    ctx.strokeStyle = '#c6b47c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 33);
    ctx.lineTo(x, y - 23);
    ctx.stroke();
    const lampGlow = ctx.createRadialGradient(x, y, 0, x, y, 80);
    lampGlow.addColorStop(0, '#ffce7340');
    lampGlow.addColorStop(1, '#ffce7300');
    ctx.fillStyle = lampGlow;
    ctx.fillRect(x - 80, y - 80, 160, 160);
    ctx.fillStyle = '#e8a85c';
    ctx.beginPath();
    ctx.ellipse(x, y, 15, 23, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#9b5f3e';
    for (const dx of [-7, 0, 7]) {
      ctx.beginPath();
      ctx.ellipse(x + dx * 0.35, y, 7, 23, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#f5d18a';
    ctx.fillRect(x - 10, y - 25, 20, 4);
    ctx.fillRect(x - 10, y + 22, 20, 4);
    ctx.fillRect(x - 1, y + 26, 2, 17);
  }
  for (const corner of [0, w])
    for (let i = 0; i < 10; i++) {
      ctx.save();
      ctx.translate(corner + (corner ? -1 : 1) * (i * 17), 40 + Math.sin(i) * 20);
      ctx.rotate((corner ? 1 : -1) * i * 0.35);
      ctx.fillStyle = i % 2 ? '#436f4d' : '#315c43';
      ctx.beginPath();
      ctx.ellipse(0, 0, 35, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  const vignette = ctx.createRadialGradient(w / 2, h * 0.5, w * 0.15, w / 2, h * 0.5, w * 0.85);
  vignette.addColorStop(0, '#061b2300');
  vignette.addColorStop(1, '#335b4930');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}
