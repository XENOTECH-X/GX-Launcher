globalThis.eaglercraftXOpts = {
  enableMinceraft: true,
  allowFNAWSkins: true,
  allowBootMenu: true,
  allowServerRedirects: true,
  container: 'game_frame',
  servers: [

  ]
};

const ver = '1.17.1';

const loader = {};

for (const m of [ 'setItem', 'removeItem' ]) {
  localStorage[m] = new Proxy(localStorage[m], {
    async apply(a, b, c) {
      const ret = Reflect.apply(a, b, c);
      let [key, value] = c;
      if (key.endsWith('X.s')) await s();
      return ret;
    }
  });
}

async function load () {
  document.addEventListener('contextmenu', (ev) => ev.preventDefault());
  loader.el = document.querySelector('#loader');

  const txt = loader.el.textContent;
  let i = 0;
  loader.interval = setInterval(() => {
    i = ++i % 4;
    loader.el.textContent = txt + ''.repeat(i);
  }, 500);

  document.title += ` ${ver}`;

  await s();
  await init();
}

async function init () {
  const [scriptBlob, assetsBlob] = await new Promise((resolve, reject) => {
    const worker = new Worker('assets/js/worker.js');

    worker.onmessage = ({ data }) => {
      worker.terminate();

      if (data.type === 'res') {
        resolve(data.res);
      } else if (data.type === 'error') {
        reject(new Error(data.error));
      }
    };

    worker.onerror = (e) => {
      worker.terminate();
      reject(e);
    };

    worker.postMessage({
      type: 'fetch',
      urls: [ '../game/classes.js', '../game/assets.epk' ]
    });
  });

  const scriptURI = URL.createObjectURL(scriptBlob, 'text/javascript');
  const assetsURI = URL.createObjectURL(assetsBlob, 'application/octet-stream');

  globalThis.eaglercraftXOpts.assetsURI = assetsURI;

  const script = document.createElement('script');
  script.src = scriptURI;
  script.onload = start;
  document.head.appendChild(script);
}

function start () {
  document.querySelectorAll('.remove').forEach(e => e.remove());
  clearInterval(loader.interval);
  document.body.classList.add('game');
  main();
}

async function s () {
  return; // await writeServers(['_eaglercraftX.s', 'false']);
}
