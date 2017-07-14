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
          videoItemLinkElement.href = 'http://localhost:3000/feedback/' + videoItemLinkElement.innerHTML;
          videoItemElement.appendChild(videoItemLinkElement);
          videoListElement.appendChild(videoItemElement);
        }
      }
    }
  }
  httpRequest.open('GET', 'http://localhost:3000/videos', true);
  httpRequest.send(null);
});
