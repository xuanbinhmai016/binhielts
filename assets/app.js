(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const library = window.IELTS_LESSONS;
  const skills = ['Listening','Reading','Writing','Speaking'];
  const KEY = 'ielts-studio-v2';
  const blank = () => ({version:2,target:'7',drafts:{},sessions:[],diagnostic:{}});
  let state = blank();
  let warning = '';
  function valid(value) {
    if (!value || value.version !== 2 || !['5.5','6','6.5','7','7.5','8','8.5','9'].includes(value.target)) return false;
    if (!value.drafts || typeof value.drafts !== 'object' || Array.isArray(value.drafts)) return false;
    if (!Object.entries(value.drafts).every(([id,text]) => library.some(l=>l.id===id) && typeof text==='string' && text.length<=500000)) return false;
    if (!Array.isArray(value.sessions) || value.sessions.length>10000 || !value.sessions.every(s=>s && skills.includes(s.skill) && typeof s.date==='string' && (s.correct===undefined || (Number.isInteger(s.correct)&&s.correct>=0&&s.correct<=5)))) return false;
    if (!value.diagnostic || typeof value.diagnostic!=='object' || Array.isArray(value.diagnostic)) return false;
    return Object.entries(value.diagnostic).every(([id,d]) => library.some(l=>l.id===id&&l.mode==='diagnostic') && d && typeof d==='object' && (d.correct===undefined || (Number.isInteger(d.correct)&&d.correct>=0&&d.correct<=5)) && (d.reflection===undefined || ['Needs support','Somewhat comfortable','Comfortable'].includes(d.reflection)));
  }
  try {
    const saved=JSON.parse(localStorage.getItem(KEY)||'null');
    if(valid(saved)) state=saved;
    else {
      const old=JSON.parse(localStorage.getItem('ielts-studio-v1')||'null');
      if(old && old.version===1 && typeof old.draft==='string' && Array.isArray(old.sessions)) {
        const migrated={version:2,target:old.target,drafts:{'starter-writing':old.draft},sessions:old.sessions,diagnostic:{}};
        if(valid(migrated)) state=migrated;
      }
    }
  } catch { warning='Browser storage is unavailable. Export backups to keep your work.'; }
  let mode='practice', skill='Listening', selected='starter-listening';
  let diagnosticIndex=0, timer=null, deadline=null, seconds=0;
  let recorder=null, stream=null, clip=null, clipUrl=null, aiAudioUrl=null;
  let generation=0, pendingRecording=false, requestBusy=false;
  const modes=[
    {id:'diagnostic',title:'Check my level',note:'Four short starting-point activities'},
    {id:'practice',title:'Daily practice',note:'Choose a skill and get explanations'},
    {id:'test',title:'Test mode',note:'Timed mini tests with a final review'},
    {id:'coach',title:'AI coach',note:'Ask questions and practise with AI'},
  ];
  const diagnostic=library.filter(l=>l.mode==='diagnostic');
  const base=(window.IELTS_CONFIG?.API_BASE_URL||'').replace(/\/$/,'');
  const allowedBase=(()=>{try{const u=new URL(base);return u.protocol==='https:' || (u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname));}catch{return false;}})();
  function message(text){$('status').textContent=text;}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{message('Cannot save locally. Export a study backup.');}overview();}
  function overview(){
    $('progress').textContent=`${state.sessions.length} practice attempts logged · ${Object.keys(state.diagnostic).length}/4 diagnostic steps completed`;
    $('target').value=state.target;
    skills.forEach(s=>$('count-'+s).textContent=state.sessions.filter(x=>x.skill===s).length);
  }
  function log(row, correct){
    state.sessions.push({skill:row.skill,id:row.id,date:new Date().toISOString(),...(correct===undefined?{}:{correct})});
    if(state.sessions.length>10000)state.sessions.shift();save();
  }
  function stopTimer(){clearInterval(timer);timer=null;deadline=null;}
  function cleanup(){
    generation++;stopTimer();
    $('lesson')?.querySelectorAll('audio').forEach(audio=>audio.pause());
    if('speechSynthesis'in window)speechSynthesis.cancel();
    if(recorder&&recorder.state!=='inactive')recorder.stop();
    if(stream)stream.getTracks().forEach(t=>t.stop());
    stream=null;recorder=null;clip=null;
    if(clipUrl)URL.revokeObjectURL(clipUrl);clipUrl=null;
    if(aiAudioUrl)URL.revokeObjectURL(aiAudioUrl);aiAudioUrl=null;
  }
  function timerUI(host, duration, onExpire){
    seconds=duration;
    const panel=document.createElement('div');
    panel.innerHTML='<p class="timer" role="timer"></p><button type="button">Start timer</button><button type="button" class="secondary">Pause</button><button type="button" class="secondary">Restart</button>';
    const display=panel.querySelector('p'), buttons=panel.querySelectorAll('button');
    const paint=()=>display.textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
    paint();host.append(panel);
    buttons[0].onclick=()=>{
      if(timer||seconds<=0)return;deadline=Date.now()+seconds*1000;
      timer=setInterval(()=>{seconds=Math.max(0,Math.ceil((deadline-Date.now())/1000));paint();if(!seconds){stopTimer();message('Time is up.');if(onExpire)onExpire();}},250);
    };
    buttons[1].onclick=()=>{if(deadline)seconds=Math.max(0,Math.ceil((deadline-Date.now())/1000));stopTimer();paint();};
    buttons[2].onclick=()=>{stopTimer();seconds=duration;paint();};
    return {start:()=>buttons[0].click(),setDuration:n=>{stopTimer();seconds=n;duration=n;paint();}};
  }
  function button(text,action){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=action;return b;}
  function paragraph(text,cls){const p=document.createElement('p');p.textContent=text;if(cls)p.className=cls;return p;}
  function current(){return mode==='diagnostic'?diagnostic[diagnosticIndex]:library.find(x=>x.id===selected);}
  function setMode(value){mode=value;diagnosticIndex=0;render();}
  function changeSkill(value){skill=value;selected=library.find(x=>x.skill===skill&&x.mode==='practice').id;render();}
  function summary(){
    const host=$('diagnostic-summary');host.replaceChildren();
    host.hidden=mode!=='diagnostic';if(host.hidden)return;
    const heading=document.createElement('h3');heading.textContent='Your starting-point profile';host.append(heading);
    diagnostic.forEach(row=>{
      const result=state.diagnostic[row.id];
      let text=`${row.skill}: not completed yet.`;
      if(result && row.questions.length){
        const recommendation=result.correct<=2?'Start with short guided exercises.':result.correct<=4?'Practise accuracy and review missed answers.':'Try longer practice next; this short sample does not establish an overall level.';
        text=`${row.skill}: ${result.correct}/${row.questions.length} on this exercise. ${recommendation}`;
      } else if(result)text=`${row.skill}: self-reflection — ${result.reflection}. ${result.reflection==='Needs support'?'Begin with short responses and a model structure.':'Continue practising and review your response.'}`;
      host.append(paragraph(text,'diagnostic-row'));
    });
    host.append(paragraph('This is a short, unvalidated starting-point check. It does not determine your overall English ability, CEFR level or IELTS band. Writing and speaking use self-reflection, not objective scores.','muted'));
    if(Object.keys(state.diagnostic).length===4)host.append(button('Continue with daily practice',()=>setMode('practice')));
  }
  async function api(path,payload,audio=false){
    if(!allowedBase)throw new Error('AI is not configured. Set a valid backend URL in assets/config.js.');
    if(!$('ai-consent').checked)throw new Error('Please read and select the consent checkbox before sending data.');
    const code=$('ai-code').value;if(!code)throw new Error('Enter the backend access code. Never enter an OpenAI API key here.');
    if(requestBusy)throw new Error('Please wait for the current AI request.');
    requestBusy=true;const abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),90000);
    try{
      const isForm=payload instanceof FormData;
      const res=await fetch(base+path,{method:'POST',headers:{'X-Study-Code':code,...(isForm?{}:{'Content-Type':'application/json'})},body:isForm?payload:JSON.stringify(payload),signal:abort.signal,credentials:'omit'});
      if(!res.ok){let error='AI request failed.';try{error=(await res.json()).error||error;}catch{}throw new Error(error);}
      return audio?await res.blob():await res.json();
    } catch(e){if(e.name==='AbortError')throw new Error('AI request timed out. Try a shorter recording.');throw e;}
    finally{requestBusy=false;clearTimeout(timeout);}
  }
  function consentHint(){message('Working with AI. Your selected text/audio is being sent for this request.');}
  function render(){
    cleanup();overview();summary();
    const oldNotice=$('activity-opened');if(oldNotice)oldNotice.remove();
    document.querySelectorAll('#modes button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
    $('mode-help').textContent=modes.find(m=>m.id===mode).note+'. Original short activities, not a full examination.';
    $('section-title').textContent=modes.find(m=>m.id===mode).title;
    $('skills').hidden=mode==='diagnostic'||mode==='coach';
    $('lesson-picker').hidden=mode==='diagnostic'||mode==='coach';
    $('coach-panel').hidden=mode!=='coach';$('lesson').hidden=mode==='coach';
    document.querySelectorAll('#skills button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.skill===skill)));
    if(mode==='coach')return;
    const available=library.filter(l=>l.mode==='practice'&&l.skill===skill);
    $('lesson-select').replaceChildren();available.forEach(l=>{const option=document.createElement('option');option.value=l.id;option.textContent=l.title;$('lesson-select').append(option);});$('lesson-select').value=selected;
    const row=current(),host=$('lesson');host.replaceChildren();if(!row)return;
    const token=generation;
    const heading=document.createElement('h2');heading.id='lesson-title';heading.textContent=row.title;host.append(heading,paragraph(row.instructions));
    if(mode==='diagnostic')host.prepend(paragraph(`Step ${diagnosticIndex+1} of 4 · ${row.skill}`,'diagnostic-step'));
    if(mode==='test')host.append(paragraph(`Timed mini test: ${row.minutes} minutes. The timer starts now. Final review appears after submission. Answer keys are public in this study app; this is not a secure examination.`,'test-notice'));
    let finishTest=null;
    const clock=timerUI(host,row.minutes*60,()=>{if(mode==='test'&&finishTest)finishTest();});
    const passage=document.createElement('div');passage.className='passage';passage.textContent=row.content;
    if(row.skill==='Listening'){
      const audioPanel=document.createElement('section');
      audioPanel.className='listening-audio-panel';
      audioPanel.setAttribute('aria-label','Listening audio');
      const audioTitle=document.createElement('h3');audioTitle.textContent='Listening audio';
      const audioStatus=paragraph('Ready. Press Play listening audio to begin.','audio-status');
      audioStatus.setAttribute('role','status');audioStatus.setAttribute('aria-live','polite');
      const controls=document.createElement('div');controls.className='audio-controls';
      const speedLabel=document.createElement('label');speedLabel.htmlFor='listening-speed';speedLabel.textContent='Speed · applies on next Play';
      const speed=document.createElement('select');speed.id='listening-speed';
      [[.75,'Slower · 0.75×'],[.85,'Steady · 0.85×'],[1,'Normal · 1×']].forEach(([value,text])=>{
        const option=document.createElement('option');option.value=value;option.textContent=text;speed.append(option);
      });speed.value='0.85';
      const generated=document.createElement('audio');generated.controls=true;generated.hidden=true;
      generated.setAttribute('aria-label','AI-generated listening audio');
      let speechGeneration=0, activeUtterance=null;
      const supported=()=>('speechSynthesis' in window)&&('SpeechSynthesisUtterance' in window);
      const stopSpeech=()=>{speechGeneration++;activeUtterance=null;if(supported())speechSynthesis.cancel();};
      generated.addEventListener('play',()=>{stopSpeech();audioStatus.textContent='Playing AI-generated audio.';});
      generated.addEventListener('error',()=>{audioStatus.textContent='AI audio could not load. Try browser audio instead.';});
      controls.append(button('Play listening audio',()=>{
        if(!supported()){audioStatus.textContent='Browser speech is unavailable. Try another browser or use AI audio below if configured.';return;}
        try{
          generated.pause();stopSpeech();const speechToken=speechGeneration;
          const utterance=new SpeechSynthesisUtterance(row.content);activeUtterance=utterance;
          utterance.lang='en-GB';utterance.rate=Number(speed.value);
          utterance.onstart=()=>{if(token===generation&&speechToken===speechGeneration)audioStatus.textContent='Playing listening audio.';};
          utterance.onend=()=>{if(token===generation&&speechToken===speechGeneration){activeUtterance=null;audioStatus.textContent='Finished. Press Play to listen again.';}};
          utterance.onerror=()=>{if(token===generation&&speechToken===speechGeneration)audioStatus.textContent='Audio could not play. Check device volume and try another browser.';};
          audioStatus.textContent='Starting browser audio…';speechSynthesis.speak(utterance);
        }catch{audioStatus.textContent='Audio is blocked. Check browser settings or try another browser.';}
      }),button('Pause',()=>{
        if(supported()&&activeUtterance){speechSynthesis.pause();audioStatus.textContent='Paused. Press Resume to continue.';}
      }),button('Resume',()=>{
        if(supported()&&activeUtterance){speechSynthesis.resume();audioStatus.textContent='Resuming audio.';}
      }),button('Stop',()=>{
        stopSpeech();generated.pause();if(generated.src)generated.currentTime=0;
        audioStatus.textContent='Stopped. Play starts from the beginning.';
      }));
      audioPanel.append(audioTitle,paragraph('Listen first, then answer the questions below. Browser speech works without an AI key where supported.','muted'),controls,speedLabel,speed,audioStatus);
      const aiDetails=document.createElement('details');
      const aiSummary=document.createElement('summary');aiSummary.textContent='Optional AI audio · backend setup required';
      const generate=button('Generate AI audio',async()=>{
        generate.disabled=true;audioStatus.textContent='Requesting AI audio…';
        try{
          consentHint();const blob=await api('/api/listening',{lessonId:row.id},true);
          if(token!==generation)return;
          stopSpeech();generated.pause();if(aiAudioUrl)URL.revokeObjectURL(aiAudioUrl);
          aiAudioUrl=URL.createObjectURL(blob);generated.src=aiAudioUrl;generated.hidden=false;
          audioStatus.textContent='AI audio ready. Press play on the audio player below.';
        }catch(e){if(token===generation){audioStatus.textContent=e.message;message(e.message);}}
        finally{generate.disabled=false;}
      });
      aiDetails.append(aiSummary,paragraph('Requires your configured backend and consent. The player appears after audio is generated.','muted'),generate,generated);
      audioPanel.append(aiDetails,paragraph('Both options use synthetic voices for original passages, not Cambridge recordings.','muted'));
      host.insertBefore(audioPanel,heading.nextSibling);
      const details=document.createElement('details'),summaryNode=document.createElement('summary');summaryNode.textContent='Review transcript';details.append(summaryNode,passage);
      if(mode==='test'||mode==='diagnostic')details.hidden=true;host.append(details);host._transcript=details;
    }else host.append(passage);
    if(row.questions.length){
      const form=document.createElement('form'),inputs=[];
      row.questions.forEach((q,i)=>{
        const label=document.createElement('label');label.htmlFor='answer-'+i;label.textContent=`${i+1}. ${q.prompt}`;
        const input=document.createElement('input');input.id='answer-'+i;input.type='text';input.required=true;input.autocomplete='off';inputs.push(input);form.append(label,input);
      });
      const submit=document.createElement('button');submit.type='submit';submit.textContent=mode==='test'?'Finish mini test':'Check answers';
      const feedback=document.createElement('div');feedback.className='feedback';feedback.setAttribute('aria-live','polite');form.append(submit,feedback);
      let finished=false;
      const check=()=>{
        if(finished)return;finished=true;stopTimer();submit.disabled=true;let correct=0;feedback.replaceChildren();
        const norm=x=>x.trim().toLowerCase().replace(/\s+/g,' ').replace(/-/g,' ');
        row.questions.forEach((q,i)=>{const ok=norm(inputs[i].value)===norm(q.answer);if(ok)correct++;inputs[i].disabled=true;feedback.append(paragraph(`${i+1}. ${ok?'Correct':'Review'} — ${q.answer}. ${q.explanation}`));});
        feedback.prepend(paragraph(`${correct}/${row.questions.length} on this exercise — not an IELTS band.`));
        if(host._transcript)host._transcript.hidden=false;
        log(row,correct);
        if(mode==='diagnostic'){state.diagnostic[row.id]={correct};save();summary();host.append(button(diagnosticIndex<3?'Next diagnostic step':'View completed profile',()=>{if(diagnosticIndex<3){diagnosticIndex++;render();}else{$('diagnostic-summary').scrollIntoView({block:'start'});}}));}
        else host.append(button('Try this activity again',render));
      };
      finishTest=check;form.onsubmit=e=>{e.preventDefault();check();};host.append(form);
    }else{
      if(row.skill==='Writing'){
        const label=document.createElement('label');label.htmlFor='draft';label.textContent='Your response';
        const draft=document.createElement('textarea');draft.id='draft';draft.maxLength=500000;draft.value=state.drafts[row.id]||'';
        const count=paragraph('');const update=()=>{const n=draft.value.trim()?draft.value.trim().split(/\s+/).length:0;count.textContent=`${n} words · ${mode==='diagnostic'?'Aim for 80–120':row.title.includes('Task 1')?'Aim for at least 150':'Aim for at least 250'}`;};
        draft.oninput=()=>{state.drafts[row.id]=draft.value;save();update();};update();host.append(label,draft,count);
      }
      if(row.skill==='Speaking'){
        const switchClock=button('Use 2-minute speaking timer',()=>clock.setDuration(120));host.append(switchClock);
        const start=button('Start recording',async()=>{
          if(pendingRecording)return;
          if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){message('Use HTTPS/localhost and a supported browser, or upload an audio file.');return;}
          pendingRecording=true;start.disabled=true;
          try{
            const acquired=await navigator.mediaDevices.getUserMedia({audio:true});
            if(token!==generation){acquired.getTracks().forEach(t=>t.stop());return;}
            stream=acquired;const chunks=[];const rec=new MediaRecorder(acquired);recorder=rec;
            rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
            rec.onstop=()=>{
              acquired.getTracks().forEach(t=>t.stop());if(token!==generation)return;
              clip=new Blob(chunks,{type:rec.mimeType||chunks[0]?.type||'audio/webm'});
              if(clipUrl)URL.revokeObjectURL(clipUrl);clipUrl=URL.createObjectURL(clip);player.src=clipUrl;download.href=clipUrl;download.download=clip.type.includes('mp4')?'practice.m4a':clip.type.includes('ogg')?'practice.ogg':'practice.webm';download.hidden=false;start.disabled=false;stop.disabled=true;stream=null;message('Recording stays local until you request AI feedback. Download before switching activities.');
            };rec.start();stop.disabled=false;message('Recording locally. Press Stop recording when finished.');
          }catch{if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;start.disabled=false;message('Microphone unavailable. Check permissions or upload a recording.');}
          finally{pendingRecording=false;}
        });
        const stop=button('Stop recording',()=>{if(recorder&&recorder.state!=='inactive')recorder.stop();});stop.disabled=true;
        const player=document.createElement('audio');player.controls=true;
        const download=document.createElement('a');download.textContent='Download recording';download.hidden=true;
        host.append(start,stop,player,download);
        const uploadLabel=document.createElement('label');uploadLabel.textContent='Or select your own recording (maximum 10 MB)';const upload=document.createElement('input');upload.type='file';upload.accept='audio/webm,audio/mp4,audio/mpeg,audio/wav,audio/ogg,.m4a,.mp3,.wav,.webm,.ogg';uploadLabel.append(upload);
        upload.onchange=()=>{const file=upload.files[0];if(!file)return;if(file.size>10*1024*1024){message('Choose an audio file smaller than 10 MB.');return;}clip=file;if(clipUrl)URL.revokeObjectURL(clipUrl);clipUrl=URL.createObjectURL(clip);player.src=clipUrl;message('Audio selected locally. It is not uploaded yet.');};host.append(uploadLabel);
        const response=paragraph('','ai-feedback');response.setAttribute('aria-live','polite');
        host.append(button('Get AI speaking feedback',async()=>{
          if(!clip){message('Record or select an audio file first.');return;}
          if(clip.size>10*1024*1024){message('Recording exceeds 10 MB. Use a shorter clip.');return;}
          const type=clip.type||'audio/webm';const ext=type.includes('mp4')?'m4a':type.includes('mpeg')?'mp3':type.includes('wav')?'wav':type.includes('ogg')?'ogg':'webm';
          const form=new FormData();form.append('audio',clip,'practice.'+ext);form.append('lessonId',row.id);
          try{consentHint();const result=await api('/api/speaking',form);if(token!==generation)return;response.textContent=`Transcript (check for errors):\n${result.transcript}\n\nProvisional transcript-based feedback:\n${result.feedback}`;message('Feedback ready. Pronunciation and real-time fluency were not assessed.');}catch(e){message(e.message);}
        }),response);
      }
      const review=document.createElement('h3');review.textContent='Self-review';host.append(review);
      const items=row.skill==='Writing'?['I answered the prompt clearly.','I organised ideas with reasons or examples.','I checked vocabulary, grammar and punctuation.']:['My message is understandable.','I can connect ideas without reading a script.','I can identify words or pauses to practise.'];
      items.forEach(text=>{const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';label.append(input,document.createTextNode(' '+text));host.append(label);});
      const reflection=document.createElement('select');reflection.setAttribute('aria-label','How comfortable did you feel?');['Needs support','Somewhat comfortable','Comfortable'].forEach(text=>{const opt=document.createElement('option');opt.textContent=text;reflection.append(opt);});host.append(paragraph('How comfortable did you feel?'),reflection);
      const finish=button(mode==='diagnostic'?'Save reflection and continue':'Log practice',()=>{
        stopTimer();log(row);
        if(mode==='diagnostic'){state.diagnostic[row.id]={reflection:reflection.value};save();if(diagnosticIndex<3){diagnosticIndex++;render();}else{summary();message('Starting-point profile complete. Review your recommendations above.');finish.disabled=true;}}
        else{finish.disabled=true;message('Practice logged. You can choose another activity.');}
      });host.append(finish);
      finishTest=()=>message('Time finished. Review your response and press Log practice or Save reflection.');
    }
    if(mode==='test')clock.start();
  }
  $('next-activity-button').onclick=()=>{
    const activities=library.filter(item=>item.mode==='practice'&&item.skill===skill);
    if(!activities.length){message('No activities are available for this skill.');return;}
    const index=mode==='practice'?activities.findIndex(item=>item.id===selected):-1;
    const next=activities[(index+1)%activities.length];
    mode='practice';diagnosticIndex=0;selected=next.id;render();
    let notice=$('activity-opened');
    if(!notice){notice=paragraph('','activity-opened');notice.id='activity-opened';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');$('section-title').insertAdjacentElement('afterend',notice);}
    notice.textContent=`Opened ${next.skill}: ${next.title}. Activity ${activities.findIndex(item=>item.id===next.id)+1} of ${activities.length}.`;
    const panel=$('practice');panel.setAttribute('tabindex','-1');
    panel.focus({preventScroll:true});
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    panel.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
  };
  modes.forEach(m=>{
    const b=button('',()=>setMode(m.id));b.dataset.mode=m.id;b.dataset.step=String(modes.findIndex(item=>item.id===m.id)+1).padStart(2,'0');const title=document.createElement('strong');title.textContent=m.title;const small=document.createElement('small');small.textContent=m.note;b.append(title,small);$('modes').append(b);
  });
  const notes={Listening:'Tune in and understand',Reading:'Discover ideas in text',Writing:'Put your ideas into words',Speaking:'Find your speaking voice'};
  skills.forEach(name=>{const b=button(name,()=>changeSkill(name));b.dataset.skill=name;b.dataset.icon=name[0];b.dataset.note=notes[name];b.setAttribute('aria-label',name+': '+notes[name]);$('skills').append(b);});
  $('lesson-select').onchange=e=>{selected=e.target.value;render();};
  $('target').onchange=e=>{state.target=e.target.value;save();};
  $('ai-connection').textContent=allowedBase?'Backend URL configured. An access code and consent are still required. Live connection has not been checked.':'AI is offline until the owner deploys the backend and sets API_BASE_URL in assets/config.js. Other practice works without AI.';
  $('ask-coach').onclick=async()=>{
    const text=$('coach-question').value.trim();if(!text){message('Type a question first.');return;}
    try{consentHint();const result=await api('/api/coach',{skill:$('coach-skill').value,text});$('coach-answer').textContent=result.feedback;message('AI reply ready. Treat it as provisional guidance.');}catch(e){message(e.message);}
  };
  function exportState(){const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='ielts-study-backup-v2.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $('export').onclick=exportState;
  $('import').onchange=async e=>{
    const file=e.target.files[0];if(!file)return;
    try{
      if(file.size>5*1024*1024)throw new Error('Backup exceeds 5 MB.');
      let value=JSON.parse(await file.text());
      if(value?.version===1)value={version:2,target:value.target,drafts:{'starter-writing':value.draft||''},sessions:value.sessions,diagnostic:{}};
      if(!valid(value))throw new Error('Invalid study backup.');
      if(!confirm('Replace current study data? Export a backup first.'))return;
      state={version:2,target:value.target,drafts:Object.fromEntries(Object.entries(value.drafts)),sessions:value.sessions.map(s=>({skill:s.skill,date:s.date,...(typeof s.id==='string'?{id:s.id}:{}),...(s.correct===undefined?{}:{correct:s.correct})})),diagnostic:Object.fromEntries(Object.entries(value.diagnostic).map(([id,d])=>[id,d.correct===undefined?{reflection:d.reflection}:{correct:d.correct}]))};save();render();message('Study backup imported.');
    }catch(e2){message(e2.message);}finally{e.target.value='';}
  };
  $('reset').onclick=()=>{if(confirm('Delete drafts, diagnostic results and progress?')){state=blank();try{localStorage.removeItem('ielts-studio-v1');}catch{}save();render();message('Study data reset.');}};
  ['large-text','high-contrast'].forEach(id=>{const b=$(id);let enabled=false;try{enabled=localStorage.getItem('ielts-display-'+id)==='true';}catch{}document.body.classList.toggle(id,enabled);b.setAttribute('aria-pressed',String(enabled));b.onclick=()=>{const active=document.body.classList.toggle(id);b.setAttribute('aria-pressed',String(active));try{localStorage.setItem('ielts-display-'+id,String(active));}catch{}};});
  window.addEventListener('pagehide',cleanup);
  render();if(warning)message(warning);
})();
