document.addEventListener('DOMContentLoaded', () => {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const menuButton = document.querySelector('.menu-button');
  const nav = document.querySelector('.site-nav');
  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(isOpen));
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
    }));
  }

  const themeButton = document.querySelector('.theme-button');
  const savedTheme = localStorage.getItem('portfolio-theme');
  if (savedTheme === 'light') document.body.classList.add('light-theme');
  if (themeButton) {
    themeButton.textContent = document.body.classList.contains('light-theme') ? '☀️' : '🌙';
    themeButton.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
      const light = document.body.classList.contains('light-theme');
      localStorage.setItem('portfolio-theme', light ? 'light' : 'dark');
      themeButton.textContent = light ? '☀️' : '🌙';
      themeButton.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
    });
  }

  const revealItems = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealItems.forEach(item => observer.observe(item));

  const backTop = document.querySelector('.back-top');
  window.addEventListener('scroll', () => {
    if (backTop) backTop.classList.toggle('show', window.scrollY > 500);
  });

  const aiForm = document.getElementById('ai-form');
  const aiInput = document.getElementById('ai-input');
  const aiMessages = document.getElementById('ai-messages');
  const quickPrompts = document.querySelectorAll('[data-prompt]');
  const voiceInputButton = document.getElementById('voice-input');
  const stopVoiceButton = document.getElementById('stop-voice');
  const autoSpeak = document.getElementById('auto-speak');
  const voiceStatus = document.getElementById('voice-status');

  function addMessage(text, type) {
    const message = document.createElement('div');
    message.className = `ai-message ${type}`;
    message.textContent = text;
    aiMessages.appendChild(message);
    aiMessages.scrollTop = aiMessages.scrollHeight;
    return message;
  }

  function speakText(text) {
    if (!('speechSynthesis' in window)) {
      if (voiceStatus) voiceStatus.textContent = 'Text-to-speech is not supported in this browser.';
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = String(text).replace(/^AI:\s*/i, '').trim();
    if (!cleanText) return;
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = document.documentElement.lang || 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => {
      if (voiceStatus) voiceStatus.textContent = '🔊 AI is speaking...';
    };
    utterance.onend = () => {
      if (voiceStatus) voiceStatus.textContent = 'Voice ready.';
    };
    utterance.onerror = () => {
      if (voiceStatus) voiceStatus.textContent = 'Voice playback could not start.';
    };
    window.speechSynthesis.speak(utterance);
  }

  quickPrompts.forEach(button => {
    button.addEventListener('click', () => {
      aiInput.value = button.dataset.prompt || '';
      aiInput.focus();
    });
  });

  if (voiceInputButton && aiInput) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = document.documentElement.lang || 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      voiceInputButton.addEventListener('click', () => {
        try {
          window.speechSynthesis?.cancel();
          recognition.start();
        } catch (error) {
          if (voiceStatus) voiceStatus.textContent = 'Voice input is already listening.';
        }
      });

      recognition.onstart = () => {
        voiceInputButton.textContent = '🛑 Listening...';
        voiceInputButton.classList.add('listening');
        if (voiceStatus) voiceStatus.textContent = '🎤 Listening — speak your coding question.';
      };

      recognition.onresult = event => {
        const transcript = event.results[0][0].transcript.trim();
        aiInput.value = transcript;
        aiInput.focus();
        if (voiceStatus) voiceStatus.textContent = 'Voice captured. Press Send to AI.';
      };

      recognition.onerror = event => {
        const message = event.error === 'not-allowed'
          ? 'Microphone permission was not granted.'
          : 'Voice input could not start. Try again.';
        if (voiceStatus) voiceStatus.textContent = message;
      };

      recognition.onend = () => {
        voiceInputButton.textContent = '🎤 Speak question';
        voiceInputButton.classList.remove('listening');
      };

      if (stopVoiceButton) {
        stopVoiceButton.addEventListener('click', () => {
          recognition.stop();
          window.speechSynthesis?.cancel();
          if (voiceStatus) voiceStatus.textContent = 'Voice stopped.';
        });
      }
    } else {
      voiceInputButton.disabled = true;
      voiceInputButton.title = 'Speech recognition is not supported by this browser.';
      if (voiceStatus) voiceStatus.textContent = 'Voice input is not supported in this browser. Text-to-speech may still work.';
    }
  }

  if (stopVoiceButton) {
    stopVoiceButton.addEventListener('click', () => {
      window.speechSynthesis?.cancel();
      if (voiceStatus) voiceStatus.textContent = 'Voice stopped.';
    });
  }

  if (aiForm && aiInput && aiMessages) {
    aiForm.addEventListener('submit', async event => {
      event.preventDefault();
      const prompt = aiInput.value.trim();
      if (!prompt) return;

      window.speechSynthesis?.cancel();
      addMessage(`You: ${prompt}`, 'user');
      aiInput.value = '';
      const thinking = addMessage('AI: Thinking...', 'bot');

      try {
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: prompt })
        });
        const data = await response.json();
        const reply = data.reply || data.error || 'I could not answer that right now.';
        thinking.textContent = `AI: ${reply}`;
        if (data.reply && autoSpeak && autoSpeak.checked) speakText(data.reply);
      } catch (error) {
        const reply = 'The live AI server is not connected yet. Run the Node.js server and configure its API key.';
        thinking.textContent = `AI: ${reply}`;
        if (autoSpeak && autoSpeak.checked) speakText(reply);
      }
      aiMessages.scrollTop = aiMessages.scrollHeight;
    });
  }
});
