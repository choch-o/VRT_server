function sendHttpRequest(method, url, headers, data, callback) {
  let httpRequest = new XMLHttpRequest();
  httpRequest.onreadystatechange = () => {
    if (httpRequest.readyState === 4) {
      if (httpRequest.status === 200) {
        callback(httpRequest);
      }
    }
  }
  httpRequest.open(method, url, true);

  Object.keys(headers).forEach((key) => {
    httpRequest.setRequestHeader(key, headers.key);
  });

  httpRequest.send(data);
}
