async function fetchSplits (url) {
  const res = await fetch(url);

  if (res.ok) {
    const buf = await res.arrayBuffer();

    try {
      const meta = JSON.parse(new TextDecoder().decode(buf));

      if (meta?.split === true && typeof meta.parts === 'number') {
        const parts = await Promise.all(
          Array.from({ length: meta.parts }, (_, i) =>
            fetch(`${url}.part${i}`)
          )
        );

        if (!parts.some(r => !r.ok)) {
          return await new Blob(
            await Promise.all(
              parts.map(r => r.arrayBuffer())
            )
          );
        }
      }
    } catch {}

    return new Blob([buf]);
  } else {
    return undefined;
  }
}

async function fetchSplitsBytes (url) {
  return await fetchSplits(url).arrayBuffer();
}

async function fetchSplitsMulti (urls) {
  return Promise.all(urls.map(fetchSplits));
}

async function fetchSplitsBytesMulti (urls) {
  return Promise.all(urls.map(fetchSplitsBytes));
}
