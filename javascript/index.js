const $document = $( document );
$document.ready(() => {
  let videoListElement = document.getElementById('video_list');
  let httpRequest = new XMLHttpRequest();
  httpRequest.onreadystatechange = () => {
    if (httpRequest.readyState === 4) {
      if (httpRequest.status === 200) {
        let videoList = JSON.parse(httpRequest.responseText);
        for (let i = 0; i < videoList.length; i++) {
          let videoItemElement = document.createElement('li');
          let videoItemLinkElement = document.createElement('a');
          videoItemLinkElement.innerHTML = videoList[i].replace('static/videos/', '');
          // videoItemLinkElement.href = 'http://emma.kaist.ac.kr:3000/feedback/' + videoItemLinkElement.innerHTML;
          videoItemLinkElement.href = 'http://192.168.1.144:3000/feedback/' + videoItemLinkElement.innerHTML;
          videoItemElement.appendChild(videoItemLinkElement);
          videoListElement.appendChild(videoItemElement);
        }
      }
    }
  }
  // httpRequest.open('GET', 'http://emma.kaist.ac.kr:3000/videos', true);
  httpRequest.open('GET', 'http://192.168.1.144:3000/videos', true);
  httpRequest.send(null);
});
