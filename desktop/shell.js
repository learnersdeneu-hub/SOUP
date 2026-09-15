const urlInput = document.getElementById("url");

document.getElementById("back").addEventListener("click", () => window.soupShell.back());
document.getElementById("forward").addEventListener("click", () => window.soupShell.forward());
document.getElementById("reload").addEventListener("click", () => window.soupShell.reload());
document.getElementById("home").addEventListener("click", () => window.soupShell.home());

urlInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") window.soupShell.navigate(urlInput.value);
});

window.soupShell.onUrlChanged((url) => {
  if (document.activeElement !== urlInput) urlInput.value = url;
});

window.soupShell.onFocusAddressBar(() => { urlInput.focus(); urlInput.select(); });

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") {
    event.preventDefault();
    urlInput.focus();
    urlInput.select();
  }
});

window.soupShell.currentUrl().then((url) => { if (url) urlInput.value = url; });
