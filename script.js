let pdfDoc = null,
    pageNum = 1,
    isVoiceActive = false,
    recognition,
    pageRendering = false,
    pageNumPending = null;

const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('status');

// PDF.js render function
function renderPage(num) {
    pageRendering = true;
    pdfDoc.getPage(num).then(page => {
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        page.render(renderContext).promise.then(() => {
            pageRendering = false;
            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        });
    });

    statusText.textContent = `Page ${num} of ${pdfDoc.numPages}`;
}

// Handle page navigation
function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

// Load PDF when uploaded
document.getElementById('pdfUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        const fileReader = new FileReader();
        fileReader.onload = function() {
            const typedarray = new Uint8Array(this.result);
            pdfjsLib.getDocument(typedarray).promise.then(pdf => {
                pdfDoc = pdf;
                renderPage(pageNum);
            });
        };
        fileReader.readAsArrayBuffer(file);
    }
});

// Voice recognition setup
function startVoiceNavigation() {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        alert("Your browser doesn't support voice recognition.");
        return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;

    recognition.onresult = (event) => {
        const voiceCommand = event.results[event.resultIndex][0].transcript.trim().toLowerCase();
        if (voiceCommand.includes('next')) {
            if (pageNum < pdfDoc.numPages) {
                pageNum++;
                queueRenderPage(pageNum);
            }
        } else if (voiceCommand.includes('previous')) {
            if (pageNum > 1) {
                pageNum--;
                queueRenderPage(pageNum);
            }
        } else if (voiceCommand.includes('go to page')) {
            const pageNumStr = voiceCommand.replace('go to page', '').trim();
            const goToPage = parseInt(pageNumStr, 10);
            if (goToPage > 0 && goToPage <= pdfDoc.numPages) {
                pageNum = goToPage;
                queueRenderPage(pageNum);
            }
        }
    };

    recognition.onstart = () => {
        isVoiceActive = true;
        statusText.textContent = "Voice Navigation Active!";
    };

    recognition.onend = () => {
        isVoiceActive = false;
        statusText.textContent = "Voice Navigation Stopped!";
    };

    recognition.start();
}

// Stop voice navigation
function stopVoiceNavigation() {
    if (recognition && isVoiceActive) {
        recognition.stop();
    }
}

// Event listeners for voice navigation buttons
document.getElementById('startVoiceNav').addEventListener('click', startVoiceNavigation);
document.getElementById('stopVoiceNav').addEventListener('click', stopVoiceNavigation);
