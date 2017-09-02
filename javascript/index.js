const $document = $( document );
const server_url = 'emma.kaist.ac.kr:3000';
// const server_url = '192.168.0.149:3000';
$document.ready(() => {
  updatePresentationList();

  let newPresentationSubmitBtnElement = document.getElementById('new_presentation_submit_btn');
  let presentationSelectorElement = document.getElementById('presentation_selector');

  newPresentationSubmitBtnElement.addEventListener('click', (e) => {
    let httpRequest = new XMLHttpRequest();
    let fd = new FormData();
    let presentationFile = presentationSelectorElement.files[0];
    httpRequest.onreadystatechange = () => {
      if (httpRequest.readyState === 4) {
        if (httpRequest.status === 200) {
          console.log(httpRequest.responseText);
          updatePresentationList();
        }
      }
    };
    httpRequest.open('POST', 'http://' + server_url + '/', true);
    fd.append(presentationFile.name, presentationFile);
    httpRequest.send(fd);
  });
});

function updatePresentationList() {
  let videoListElement = document.getElementById('video_list');
  while (videoListElement.hasChildNodes())
    videoListElement.removeChild(videoListElement.childNodes[0])

  let httpRequest = new XMLHttpRequest();
  httpRequest.onreadystatechange = () => {
    if (httpRequest.readyState === 4) {
      if (httpRequest.status === 200) {
        let videoList = JSON.parse(httpRequest.responseText);
        for (let i = 0; i < videoList.length; i++) {
          let videoItemElement = document.createElement('li');
          let videoItemLinkElement = document.createElement('a');
          videoItemLinkElement.innerHTML = videoList[i].replace('static/videos/', '');
          videoItemLinkElement.classList.add('list-group-item')
          videoItemLinkElement.href = 'http://' + server_url + '/feedback/' + videoItemLinkElement.innerHTML;
          videoItemElement.appendChild(videoItemLinkElement);
          videoListElement.appendChild(videoItemElement);
        }
      }
    }
  }
  httpRequest.open('GET', 'http://' + server_url + '/videos', true);
  httpRequest.send(null);
}
