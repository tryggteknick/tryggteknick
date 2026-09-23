(() => {
  const $ = (s) => document.querySelector(s);
  const menu = $('#mobile-menu');
  const menuButton = $('.menu-toggle');
  function closeMenu() { menu.hidden = true; menuButton.setAttribute('aria-expanded','false'); menuButton.setAttribute('aria-label','Öppna meny'); }
  menuButton.addEventListener('click', () => { const open = menu.hidden; menu.hidden = !open; menuButton.setAttribute('aria-expanded',String(open)); menuButton.setAttribute('aria-label',open?'Stäng meny':'Öppna meny'); });
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click',closeMenu));
  document.addEventListener('keydown',e => {if(e.key==='Escape')closeMenu();});
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function updateMotion(){document.body.classList.toggle('motion-paused',reduced.matches);}
  reduced.addEventListener('change',updateMotion);updateMotion();
  if('IntersectionObserver' in window && !reduced.matches){const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');observer.unobserve(e.target);}}),{threshold:.08});document.querySelectorAll('.reveal').forEach(el=>{el.classList.add('js-reveal');observer.observe(el);});}
  const dialog=$('#help-dialog');
  const form=$('#help-form');
  const description=$('#help-description');
  let trigger=null;
  document.querySelectorAll('[data-help]').forEach(button=>button.addEventListener('click',()=>{
    trigger=button;
    $('#help-category').value=button.dataset.help;
    closeMenu();
    dialog.showModal();
    document.body.classList.add('dialog-open');
  }));
  $('.dialog-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{
    if(event.target===dialog){
      const bounds=dialog.getBoundingClientRect();
      if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)dialog.close();
    }
  });
  dialog.addEventListener('close',()=>{document.body.classList.remove('dialog-open');trigger?.focus();});
  const submitButton=form.querySelector('[type=submit]');
  const status=$('#help-status');
  const thanks=$('#help-thanks');
  let sending=false;
  $('#dismiss-thanks').addEventListener('click',()=>{thanks.hidden=true;trigger?.focus();});
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(sending)return;
    if(description.value.trim().length<5){
      description.setCustomValidity('Beskriv gärna lite mer, minst fem tecken.');
      description.reportValidity();
      return;
    }
    if(!form.reportValidity())return;
    sending=true;
    thanks.hidden=true;
    status.textContent='Skickar din fråga…';
    submitButton.disabled=true;
    form.setAttribute('aria-busy','true');
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),20000);
    try{
      const response=await fetch('https://formsubmit.co/ajax/tryggteknick@gmail.com',{
        method:'POST',
        credentials:'omit',
        referrerPolicy:'origin',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify(Object.fromEntries(new FormData(form))),
        signal:controller.signal
      });
      const data=await response.json().catch(()=>null);
      const serviceMessage=typeof data?.message==='string'?data.message.slice(0,300):'';
      if(/activat|confirm.*email|verify.*email/i.test(serviceMessage))throw new Error('Activation required');
      if(response.status===429)throw new Error('Rate limited');
      if(!response.ok||(data?.success!==true&&data?.success!=='true')){
        status.textContent=serviceMessage
          ? 'FormSubmit kunde inte bekräfta skickandet: '+serviceMessage+' Din text finns kvar.'
          : 'FormSubmit gav ett oväntat svar (HTTP '+response.status+'). Din text finns kvar. Försök igen om en stund.';
        return;
      }
      form.reset();
      status.textContent='';
      dialog.close();
      thanks.hidden=false;
    }catch(error){
      if(error.message==='Activation required'){
        status.textContent='Mejlkontakten behöver aktiveras av oss först. Du kan tills vidare mejla tryggteknick@gmail.com direkt. Din text finns kvar.';
      }else if(error.message==='Rate limited'){
        status.textContent='För många försök på kort tid. Vänta en stund innan du försöker igen. Din text finns kvar.';
      }else if(error.name==='AbortError'){
        status.textContent='Svaret tog för lång tid. Vi kan inte bekräfta om meddelandet skickades. Din text finns kvar.';
      }else{
        status.textContent='Det gick inte att ansluta till FormSubmit. Kontrollera internetanslutningen och försök igen, eller mejla tryggteknick@gmail.com. Din text finns kvar.';
      }
    }finally{
      clearTimeout(timeout);
      sending=false;
      submitButton.disabled=false;
      form.removeAttribute('aria-busy');
    }
  });
  description.addEventListener('input',()=>description.setCustomValidity(''));

  $('#year').textContent=new Date().getFullYear();
})();
