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
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify(Object.fromEntries(new FormData(form))),
        signal:controller.signal
      });
      const data=await response.json();
      if(!response.ok||(data.success!==true&&data.success!=='true'))throw new Error('Submission rejected');
      if(/activat/i.test(data.message||''))throw new Error('Activation required');
      form.reset();
      status.textContent='';
      dialog.close();
      thanks.hidden=false;
    }catch(error){
      status.textContent=error.message==='Activation required'
        ? 'Mejlkontakten behöver aktiveras av oss först. Du kan tills vidare mejla tryggteknick@gmail.com direkt. Din text finns kvar.'
        : 'Vi kunde inte bekräfta att meddelandet skickades. Din text finns kvar. Försök igen om en stund eller mejla tryggteknick@gmail.com.';
    }finally{
      clearTimeout(timeout);
      sending=false;
      submitButton.disabled=false;
      form.removeAttribute('aria-busy');
    }
  });
  description.addEventListener('input',()=>description.setCustomValidity(''));

  if(document.modelContext?.registerTool){
    const lifecycle=new AbortController();
    window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
    try{Promise.resolve(document.modelContext.registerTool({
      name:'prepare_help_text',title:'Förbered en fråga till TryggTeknick',
      description:'Fills the visible contact form with a local draft. Does not submit it or send email. The visitor must provide their email address and press Skicka fråga.',
      inputSchema:{type:'object',properties:{description:{type:'string',minLength:5,maxLength:1500},category:{type:'string',enum:['','Tekniken hemma','Appar och digitala tjänster','Digital trygghet','Något annat']}},required:['description'],additionalProperties:false},
      annotations:{readOnlyHint:false,untrustedContentHint:true},
      execute(input){
        const choices=['','Tekniken hemma','Appar och digitala tjänster','Digital trygghet','Något annat'];
        if(!input||typeof input.description!=='string'||input.description.trim().length<5||input.description.length>1500||!choices.includes(input.category??''))throw new Error('Provide a valid category and a description of 5–1500 characters.');
        trigger=document.querySelector('[data-help]');
        $('#help-category').value=input.category??'';
        description.value=input.description.trim();
        description.setCustomValidity('');
        closeMenu();
        if(!dialog.open)dialog.showModal();
        document.body.classList.add('dialog-open');
        return {status:'draft_prepared',sent:false,bookingCreated:false,text:description.value};
      }
    },{signal:lifecycle.signal})).catch(()=>{});}catch{}
  }
  $('#year').textContent=new Date().getFullYear();
})();
