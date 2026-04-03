console.log("----\nscript.js:");
const con = new URLSearchParams(window.location.search);
const config = Object.fromEntries(con);
var holderDiv = undefined;
var copyable = undefined;
var resizing = undefined;

document.querySelector("noscript").remove();

function redirectErrorHandler(e,context){
  console.error("CAUGHT ERROR:",e);
    const params = new URLSearchParams({
      msg: e.message,
      type: e.name,
      context: context
    }).toString();
    window.location.replace(`/err.html?${params}`);
}

if (JSON.stringify(config)==="{}") {
  // no params
  console.log('no parameters detected');
  document.querySelector("title").innerHTML += " | Home";
  copyable = true;
  
  function copycode(obj){
    if (!copyable) {return}
    copyable = false;
    const ogText = obj.innerHTML.replace("&amp;&amp;","&&");
    navigator.clipboard.writeText(ogText)
    .then(() => {
      obj.innerHTML = "Copied to clipboard!";
      setTimeout(function(){
        obj.innerHTML = ogText;
        copyable = true;
      },3000)
    })
    .catch(err => {
      console.error('Failed to copy: ', err);
      obj.innerHTML = "There was an error copying the code to the clipboard. You can refresh and try copying it manually. If you care enough, check the dev console to see what exactly happened.";
    });
  }
  
  holderDiv = document.querySelector("body > div.show-for-no-params");
  
  holderDiv.innerHTML = holderDiv.innerHTML.replace("%WEBSITE%",document.location.href);
  holderDiv.style = "display:block";
} else {
  // params of some kind
  console.log('parameters detected, modifying as needed');
  holderDiv = document.querySelector("body > div.show-for-params");
  resizing = true;
  var artistArray = [];
  var artistText = "";
  var grad = undefined;
  try {
    artistArray = config['artist'].split(",");
    if (artistArray.length == 1) {
      artistText = artistArray[0];
    } else {
      artistText = artistArray.slice(0, -1).join(', ') + ' & ' + artistArray.slice(-1);
    }

    document.querySelector("title").innerHTML += ` | ${config['name']} - ${artistArray[0]}`;

    const titleElem = holderDiv.querySelector("h1.intro");
    titleElem.innerHTML = `Gradient for <a href='https://genius.com${config['href']}' target='genius-origin'>"${config['name']}"</a> by ${artistText}`;

    grad = holderDiv.querySelector("div.background-gradient");
    grad.style = `background-image: ${config['gradient']}; resize: both;`;

    const coverArt = holderDiv.querySelector("img.cover-art");
    coverArt.src = atob(config['img']);
  } catch (e) {
    redirectErrorHandler(e,"SetupGradientViewerPage-Params");
  }
  
  function toggleResizing() {
    if (resizing) {
      resizing = false;
      grad.style.resize = "none";
    } else {
      resizing = true;
      grad.style.resize = "both";
    }
  }
  
  function viewGradient(button){
    try {
      console.log("gradient requested!");
      const curButton = document.querySelector(".hidden-unless-gradient-is-modified");
      const keyword = "takemethere";
      const recommendedWebsite = "https://cssgradient.io/";
      var answer = prompt(
          `This is the RAW CSS DATA for the gradient on "${config['name']}" by ${artistText}. It is provided in a textbox so you can copy-paste it if you so wish.

  Hit CANCEL to make no changes to the gradient. If you want to change the gradient, enter in the new linear-gradient rule here and hit OK. If you want to reset the gradient, hit OK without modifying the textbox. (Psst: Genius only uses 0deg gradients.)

  If you are unaware of a good way to specify good gradients in CSS, [${recommendedWebsite}] is a great tool. Type in "${keyword.toUpperCase()}" to make no changes and open the aforementioned website in a new tab.`,config['gradient']
        )
      if (answer == null) { console.log("CANCELLED, no action taken")} else {
        console.log("user specified new gradient rule -- modifying gradient");
        if (answer === keyword.toUpperCase()) {
          console.warn("ABORTING all gradient edits!!! user entered keyword to open gradient helper");
          window.open(recommendedWebsite,'gradient-helper');
          return false;
        }
        curButton.style = "";
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = "View Original Gradient / Edit Gradient";
        grad.style["background-image"] = answer.replace(";","").replace("background-image:","").trim();

        if (answer === config['gradient']) {
          console.log('user applying original gradient -- assume that we resetted');
          button.innerHTML = button.dataset.originalText;
          curButton.style = "display:none;";
          setTimeout(function(){delete button.dataset.originalText;},1000);
        }
      }
    } catch (e) {
      redirectErrorHandler(e,"ModifyGradientViewerPage-Params");
    }
  }
  
  function viewModifiedGradient() {
    prompt(`The gradient being shown on the page has been modified from what is shown on Genius. This is the RAW CSS DATA for the gradient that was provided by the user. It is provided in a textbox for easier copy-pasting.
    
This will not modify the gradient. If you want to edit the gradient further, please see the button directly before this one.`,grad.style['background-image'])
  }
  
  holderDiv.style = "display:block";
  
  window.history.pushState({}, document.title, window.location.origin + window.location.pathname);
}

console.log("----\nscript.js log end");
