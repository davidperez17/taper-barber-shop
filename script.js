const navToggle = document.querySelector('#navToggle');
const navLinks = document.querySelector('#navLinks');
const pageProgress = document.querySelector('#pageProgress');

navToggle?.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
  document.body.classList.toggle('no-scroll', isOpen);
});

document.querySelectorAll('.nav-links a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll');
  });
});

window.addEventListener('scroll', () => {
  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const progress = height > 0 ? (scrollTop / height) * 100 : 0;
  pageProgress.style.width = `${progress}%`;
});

const revealElements = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.16 });

revealElements.forEach((element) => revealObserver.observe(element));

const counters = document.querySelectorAll('[data-counter]');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;

    const element = entry.target;
    const target = Number(element.dataset.counter);
    const prefix = element.textContent.trim().startsWith('Q') ? 'Q' : '';
    const duration = 1100;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(target * eased);
      element.textContent = `${prefix}${value.toLocaleString('es-GT')}`;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    counterObserver.unobserve(element);
  });
}, { threshold: 0.6 });

counters.forEach((counter) => counterObserver.observe(counter));

const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = {
  cliente: document.querySelector('#tab-cliente'),
  admin: document.querySelector('#tab-admin'),
  crecimiento: document.querySelector('#tab-crecimiento')
};

tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const tab = button.dataset.tab;

    tabButtons.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');

    Object.values(tabPanels).forEach((panel) => panel.classList.remove('active'));
    tabPanels[tab]?.classList.add('active');
  });
});

const branchesInput = document.querySelector('#branches');
const branchCount = document.querySelector('#branchCount');
const monthlyTotal = document.querySelector('#monthlyTotal');

function updateBranchPrice() {
  const branches = Number(branchesInput.value);
  const total = branches * 150;
  branchCount.textContent = branches;
  monthlyTotal.textContent = `Q${total.toLocaleString('es-GT')}`;
}

branchesInput?.addEventListener('input', updateBranchPrice);
updateBranchPrice();

const faqItems = document.querySelectorAll('.faq-item');

faqItems.forEach((item) => {
  const question = item.querySelector('.faq-question');
  const answer = item.querySelector('.faq-answer');

  if (item.classList.contains('active')) {
    answer.style.maxHeight = `${answer.scrollHeight}px`;
  }

  question.addEventListener('click', () => {
    const isActive = item.classList.contains('active');

    faqItems.forEach((faq) => {
      faq.classList.remove('active');
      const faqAnswer = faq.querySelector('.faq-answer');
      if (faqAnswer) faqAnswer.style.maxHeight = null;
    });

    if (!isActive) {
      item.classList.add('active');
      answer.style.maxHeight = `${answer.scrollHeight}px`;
    }
  });
});
