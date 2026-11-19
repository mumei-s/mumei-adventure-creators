const turn = 2 * Math.PI;

function part(tag, cls, parent) {
  const node = document.createElement(tag);
  node.className = cls;
  parent.append(node);
  return node;
}

function photo(parent, cls, src, alt = '') {
  const image = part('img', cls, parent);
  image.src = './assets/' + src + '.webp';
  image.alt = alt;
  image.draggable = false;
  return image;
}

function rider(parent, source) {
  if (!source?.width || !source?.height) return;
  const canvas = part('canvas', 'ride-avatar', parent);
  canvas.dataset.poseArt = source.dataset.poseArt || 'original';
  canvas.width = source.width;
  canvas.height = source.height;
  canvas.getContext('2d').drawImage(source,0,0);
  canvas.setAttribute('aria-hidden','true');
}

function wheelStage(scene, source) {
  photo(scene,'ride-scenery','street-deck','運河沿いの遊園地と対岸の夜景');
  const layout = part('div','wheel-layout',scene);
  part('div','wheel-support',layout);
  const rim = part('div','wheel-rim',layout);
  const cabins = [];
  for (let i=0;i<12;i++) {
    const spoke = part('i','wheel-spoke',rim);
    spoke.style.transform = 'rotate(' + i*30 + 'deg)';
    const cabin = part('div','wheel-cabin' + (i===0?' ride-carriage selected-cabin':''),layout);
    cabin.style.setProperty('--cabin-color',['#ac4a3b','#25747b','#68769b','#ae7937'][i%4]);
    cabins.push(cabin);
  }
  part('div','wheel-hub',layout);
  const cabin = cabins[0];
  rider(cabin, source);
  const interior = part('div','wheel-interior',scene);
  const skyline = photo(interior,'wheel-skyline','ferris-view','ゴンドラから見渡す運河と遠くの街明かり');
  const windowLight = part('div','window-glass',interior);
  const station = part('span','ride-station',scene);
  let outside = false;
  const draw = fraction => {
    const a = fraction*turn;
    rim.style.transform='rotate(' + fraction*360 + 'deg)';
    cabins.forEach((node,i)=>{
      const angle=a+i*turn/cabins.length;
      node.style.left=(50-46*Math.sin(angle))+'%';
      node.style.top=(50+46*Math.cos(angle))+'%';
    });
    const elevation = (1-Math.cos(a))/2;
    // The cabin stays upright as its suspension travels around the rim.
    skyline.style.transform='scale(1.26) translate('+ (5*Math.sin(a)).toFixed(2)+'%,'+(-9+18*elevation).toFixed(2)+'%)';
    windowLight.style.opacity=String(.24+.30*elevation);
    const label = fraction<.035 || fraction>.965 ? '乗降口' : fraction<.43 ? '上昇中' : fraction<.57 ? '頂上' : '下降中';
    if(station.textContent!==label)station.textContent=label;
  };
  return {
    draw,
    switchView() {
      outside=!outside;
      scene.classList.toggle('ride-outside',outside);
      if(outside)interior.append(cabin);
      else layout.append(cabin);
      return outside;
    },
  };
}

function carouselStage(scene, source) {
  photo(scene,'ride-scenery','ride-pavilion','木の床と鏡張りの中央塔を囲む、金の灯りの回転台');
  const seats = [];
  for (let i=0;i<3;i++) {
    const mount = part('div','carousel-mount'+(i===0?' ride-carriage':''),scene);
    const useBench = i===(source?.dataset.poseArt==='seated' ? 1 : 0);
    if (useBench) {
      mount.classList.add('carousel-coach');
      photo(mount,'coach-back','ride-gondola','金の彫刻と深緑のベルベットをあしらった回転木馬の客車');
      if(i===0)rider(mount,source);
      photo(mount,'coach-side','ride-gondola');
    } else {
      photo(mount,'ride-horse','ride-saddle');
      if (i===0)rider(mount,source);
    }
    seats.push(mount);
  }
  const hub = photo(scene,'carousel-hub','ride-pavilion');
  hub.setAttribute('aria-hidden','true');
  return {
    draw(fraction) {
      seats.forEach((mount,i)=>{
        const angle=turn*(fraction+i/seats.length);
        const depth=(1+Math.cos(angle))/2;
        const size=.67+.33*depth;
        const lift=1.5*(1-Math.cos(3*angle));
        mount.style.left=(50-32*Math.sin(angle))+'%';
        mount.style.top=(58+31*depth-lift)+'%';
        mount.style.zIndex=String(2+Math.round(20*depth));
        mount.style.transform='translate(-50%,-100%) scale('+size.toFixed(4)+')';
        mount.classList.toggle('returning',Math.cos(angle)<0);
      });
    },
  };
}

export function makeRideStage(scene, kind, source) {
  const stage = kind==='wheel' ? wheelStage(scene,source) : carouselStage(scene,source);
  stage.draw(0);
  return stage;
}
