'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalized = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const today = dateKey(new Date());
  const dateLabel = value => value ? new Date(value + 'T12:00:00').toLocaleDateString('es-PE') : '—';
  const names = ['Ana María','Luis','Rosa','Juan','Lucía','Miguel','Sofía','Diego','Carmen','José','Valeria','Andrés'];
  const surnames = ['Torres López','Pérez Ruiz','Vega Castro','Díaz Silva','García Soto','López Ramos','Ríos Flores','Castro León','Sánchez Paz','Ruiz Vega','Mendoza Sol','Flores Arias'];
  const specials = ['Cardiología','Pediatría','Medicina general','Dermatología'];
  const idFor = (prefix, n) => `${prefix}-${String(n).padStart(3,'0')}`;
  const seed = {
    pacientes:names.map((n,i)=>({id_paciente:idFor('P',i+1),nombres:n,apellidos:surnames[i],dni:String(45678912+i),telefono:String(987654321-i*137),email:`paciente${i+1}@correo.pe`,f_nac:`${1980+i}-06-15`,direccion:`Av. Los Olivos ${120+i}`,estado:i===7?'Inactivo':'Activo'})),
    especialidades:specials.map((n,i)=>({id_especialidad:idFor('E',i+1),nombre:n,descripcion:['Atención cardiovascular','Salud infantil y adolescente','Consulta y evaluación integral','Salud de la piel'][i],duracion_consulta:i===1?'20':'30'})),
    medicos:['Carlos Ramos','Elena Ríos','Pedro Soto','Laura Vega','Jorge Díaz','Isabel Castro','Mario Ruiz','Paula León'].map((n,i)=>({id_medico:idFor('M',i+1),nombres:n.split(' ')[0],apellidos:n.split(' ').slice(1).join(' '),cmp:String(45678+i).padStart(6,'0'),especialidad:specials[i%4],telf:String(999456123-i*127),email:`medico${i+1}@clinica.pe`,estado:'Activo'})),
    usuarios:[{id_usuario:'U-001',nombres:'María López',email:'mlopez@clinica.pe',rol:'Administrador',estado:'Habilitado',ultimo_acceso:today+' 08:00'},{id_usuario:'U-002',nombres:'Julia Castro',email:'jcastro@clinica.pe',rol:'Recepcionista',estado:'Habilitado',ultimo_acceso:today+' 07:45'},{id_usuario:'U-003',nombres:'Carlos Ramos',email:'cramos@clinica.pe',rol:'Médico',estado:'Bloqueado',ultimo_acceso:today+' 08:15'}]
  };
  seed.citas=Array.from({length:32},(_,i)=>({id_cita:idFor('C',i+1),id_paciente:seed.pacientes[i%12].id_paciente,id_medico:seed.medicos[i%8].id_medico,especialidad:specials[i%4],fecha:today,hora:`${String(8+Math.floor(i/8)).padStart(2,'0')}:00`,motivo:['Control de rutina','Primera consulta','Seguimiento','Evaluación médica'][i%4],estado:i>29?'Cancelada':['Confirmada','Pendiente','Atendida','Confirmada'][i%4]}));
  let db;
  try {const saved=JSON.parse(localStorage.getItem('clinica-demo-v1'));db=saved && Object.keys(seed).every(k=>Array.isArray(saved[k]))?saved:structuredClone(seed);} catch {db=structuredClone(seed);}
  let toastTimer;
  function notify(message) {$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4500);}
  function persist() {try {localStorage.setItem('clinica-demo-v1',JSON.stringify(db));}catch {notify('Cambios aplicados en esta página. El navegador no permite guardarlos localmente.');}}
  const badgeClasses={Activo:'bg-emerald-50 text-emerald-700',Habilitado:'bg-emerald-50 text-emerald-700',Atendida:'bg-emerald-50 text-emerald-700',Confirmada:'bg-blue-50 text-blue-700',Pendiente:'bg-amber-50 text-amber-700',Cancelada:'bg-red-50 text-red-700',Bloqueado:'bg-red-50 text-red-700',Licencia:'bg-amber-50 text-amber-700',Inactivo:'bg-slate-100 text-slate-600'};
  const badge = status => `<span class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${badgeClasses[status] || 'bg-slate-100 text-slate-600'}"><span class="h-1.5 w-1.5 rounded-full bg-current"></span>${esc(status)}</span>`;
  const fullName = r => r ? `${r.nombres} ${r.apellidos || ''}`.trim() : 'No disponible';
  const patient = id => db.pacientes.find(p=>p.id_paciente===id);
  const doctor = id => db.medicos.find(m=>m.id_medico===id);
  const cells = r => `<td class="px-4 py-4">${esc(r)}</td>`;
  const module = document.body.dataset.module;
  $('#today-label').textContent=new Date().toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const toggleNav = open => {$('#sidebar').classList.toggle('-translate-x-full',!open);$('#nav-backdrop').hidden=!open;$('#menu-toggle').setAttribute('aria-expanded',String(open));};
  $('#menu-toggle').addEventListener('click',()=>toggleNav($('#menu-toggle').getAttribute('aria-expanded')!=='true'));
  $('#nav-backdrop').addEventListener('click',()=>toggleNav(false));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')toggleNav(false);});
  $('#logout').addEventListener('click',()=>$('#session-dialog').showModal());
  function options(select, rows, value, label, empty='Seleccionar…') {
    if(!select)return;
    const previous=select.value;
    select.innerHTML=`<option value="">${esc(empty)}</option>`+rows.map(r=>`<option value="${esc(value(r))}">${esc(label(r))}</option>`).join('');
    if(rows.some(r=>String(value(r))===previous))select.value=previous;
  }
  function appointmentCells(r) {return [r.id_cita,`${dateLabel(r.fecha)} · ${r.hora}`,fullName(patient(r.id_paciente)),fullName(doctor(r.id_medico)),r.especialidad,r.motivo].map(cells).join('')+`<td class="px-4 py-4">${badge(r.estado)}</td>`;}
  if(module==='dashboard') {
    const daily=db.citas.filter(c=>c.fecha===today);
    $('#kpi-citas').textContent=daily.length;
    $('#kpi-medicos').textContent=db.medicos.filter(m=>m.estado==='Activo').length;
    const monthly=db.citas.filter(c=>c.fecha.startsWith(today.slice(0,7)));
    const rate=monthly.length?monthly.filter(c=>c.estado==='Cancelada').length/monthly.length*100:0;
    $('#kpi-ausentismo').textContent=(Math.floor(rate*10)/10).toFixed(1)+'%';
    const rows=daily.filter(c=>c.estado!=='Cancelada').sort((a,b)=>a.hora.localeCompare(b.hora)).slice(0,6);
    $('#table-body').innerHTML=rows.map(r=>`<tr class="even:bg-slate-50/50 hover:bg-slate-50">${[r.hora,fullName(patient(r.id_paciente)),r.especialidad,fullName(doctor(r.id_medico))].map(cells).join('')}<td class="px-4 py-4">${badge(r.estado)}</td></tr>`).join('') || '<tr><td colspan="5" class="p-8 text-center text-slate-400">No hay citas para hoy.</td></tr>';
    return;
  }
  if(module==='reportes') {setupReports();return;}
  const form=$('#record-form');
  const idFields={pacientes:'id_paciente',medicos:'id_medico',especialidades:'id_especialidad',citas:'id_cita',usuarios:'id_usuario'};
  const prefixes={pacientes:'P',medicos:'M',especialidades:'E',citas:'C',usuarios:'U'};
  const idField=idFields[module];
  let selected=null,page=1;
  const pageSize=6;
  if(module==='medicos'||module==='citas')options($('#especialidad'),db.especialidades,e=>e.nombre,e=>e.nombre);
  if(module==='citas'){
    options($('#id_paciente'),db.pacientes.filter(p=>p.estado==='Activo'),p=>p.id_paciente,p=>`${fullName(p)} · ${p.dni}`);
    $('#fecha').value=today;
    $('#especialidad').addEventListener('change',()=>{refreshDoctors();refreshHours();});
    $('#id_medico').addEventListener('change',refreshHours);
    $('#fecha').addEventListener('change',refreshHours);
    refreshDoctors();refreshHours();
  }
  function refreshDoctors() {options($('#id_medico'),db.medicos.filter(m=>m.estado==='Activo' && m.especialidad===$('#especialidad').value),m=>m.id_medico,m=>fullName(m));}
  function refreshHours() {
    const previous=$('#hora').value;
    const specialty=db.especialidades.find(e=>e.nombre===$('#especialidad').value);
    const duration=Math.max(5,Number(specialty?.duracion_consulta)||30);
    const slots=[];
    for(let n=8*60;n+duration<=18*60;n+=duration){
      const time=`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
      const busy=db.citas.some(c=>c.id_cita!==selected && c.id_medico===$('#id_medico').value && c.fecha===$('#fecha').value && c.estado!=='Cancelada' && overlaps(c.hora,time,duration));
      if(!busy)slots.push(time);
    }
    options($('#hora'),slots,h=>h,h=>h,'Seleccionar turno disponible');
    if(slots.includes(previous))$('#hora').value=previous;
  }
  function overlaps(a,b,duration) {const minutes=t=>Number(t.split(':')[0])*60+Number(t.split(':')[1]);return Math.abs(minutes(a)-minutes(b))<duration;}
  function values(r) {
    switch(module){
      case 'pacientes':return [r.id_paciente,r.dni,fullName(r),r.telefono,r.email,dateLabel(r.f_nac),r.estado];
      case 'medicos':return [r.id_medico,r.cmp,fullName(r),r.especialidad,r.telf,r.email,r.estado];
      case 'especialidades':return [r.id_especialidad,r.nombre,r.descripcion,`${r.duracion_consulta} min`];
      case 'usuarios':return [r.id_usuario,r.nombres,r.email,r.rol,r.estado,r.ultimo_acceso || 'Sin acceso'];
      default:return [r.id_cita,`${r.fecha} ${r.hora}`,fullName(patient(r.id_paciente)),patient(r.id_paciente)?.dni,fullName(doctor(r.id_medico)),r.especialidad,r.motivo,r.estado];
    }
  }
  function filteredRows(){const q=normalized($('#search').value.trim());return db[module].filter(r=>normalized(values(r).join(' ')).includes(q));}
  function draw(){
    const filtered=filteredRows();const pages=Math.max(1,Math.ceil(filtered.length/pageSize));page=Math.min(page,pages);
    const visible=filtered.slice((page-1)*pageSize,page*pageSize);
    $('#table-body').innerHTML=visible.map(r=>`<tr tabindex="0" role="row" aria-selected="${r[idField]===selected}" data-id="${esc(r[idField])}" class="cursor-pointer even:bg-slate-50/50 hover:bg-slate-50 transition focus:bg-blue-50">${module==='citas'?appointmentCells(r):values(r).map(v=>`<td class="px-4 py-4">${badgeClasses[v]?badge(v):esc(v)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${module==='especialidades'?4:module==='usuarios'?6:7}" class="p-12 text-center text-slate-400">No se encontraron registros.<br><span class="text-xs">Prueba con otra búsqueda.</span></td></tr>`;
    $('#record-count').textContent=`${filtered.length} registros`;
    $('#page-info').textContent=filtered.length?`${(page-1)*pageSize+1}–${Math.min(page*pageSize,filtered.length)} de ${filtered.length} · Página ${page} de ${pages}`:'0 registros';
    document.querySelectorAll('[data-page]').forEach(b=>b.disabled=['first','prev'].includes(b.dataset.page)?page===1:page===pages);
    document.querySelector('[data-action="update"]').disabled=!selected;
    const cancel=document.querySelector('[data-action="cancel"]');if(cancel)cancel.disabled=!selected;
    const reset=document.querySelector('[data-action="reset-password"]');if(reset)reset.disabled=!selected;
  }
  function select(id){
    const r=db[module].find(row=>row[idField]===id);if(!r)return;
    selected=id;form.reset();
    if(module==='citas'){
      $('#especialidad').value=r.especialidad;refreshDoctors();
      // Historical records remain editable even if the doctor/patient is currently inactive.
      for(const [name,value,label] of [['id_medico',r.id_medico,fullName(doctor(r.id_medico))],['id_paciente',r.id_paciente,fullName(patient(r.id_paciente))]]){
        const el=form.elements[name];if(!Array.from(el.options).some(o=>o.value===value))el.add(new Option(label,value));
      }
      $('#id_medico').value=r.id_medico;$('#fecha').value=r.fecha;refreshHours();
    }
    for(const [key,value] of Object.entries(r)){const el=form.elements[key];if(el && key!=='password')el.value=value;}
    if(module==='usuarios')$('#password').required=false;
    $('#edit-status').textContent=`Editando registro ${id}`;
    draw();$('#form-title').scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function clear(){selected=null;form.reset();if(module==='usuarios')$('#password').required=true;if(module==='citas'){$('#fecha').value=today;refreshDoctors();refreshHours();}$('#edit-status').textContent='Nuevo registro · El ID se asigna automáticamente';draw();}
  $('#search').addEventListener('input',()=>{page=1;draw();});
  $('#search-form').addEventListener('submit',e=>{e.preventDefault();page=1;draw();});
  $('#table-body').addEventListener('click',e=>{const row=e.target.closest('[data-id]');if(row)select(row.dataset.id);});
  $('#table-body').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const row=e.target.closest('[data-id]');if(row){e.preventDefault();select(row.dataset.id);}}});
  document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>{const pages=Math.max(1,Math.ceil(filteredRows().length/pageSize));page={first:1,prev:Math.max(1,page-1),next:Math.min(pages,page+1),last:pages}[b.dataset.page];draw();}));
  function save(update){
    if(update && !selected){notify('Selecciona primero un registro en la tabla.');return;}
    if(!update && selected){notify('Pulsa Limpiar para registrar una nueva ficha.');return;}
    if(!form.reportValidity())return;
    const record=Object.fromEntries(new FormData(form));Object.keys(record).forEach(k=>record[k]=record[k].trim());
    const duplicate=(field)=>db[module].some(r=>r[idField]!==selected && normalized(r[field])===normalized(record[field]));
    const unique=module==='pacientes'?'dni':module==='medicos'?'cmp':module==='especialidades'?'nombre':module==='usuarios'?'email':null;
    if(unique && duplicate(unique)){notify(`Ya existe un registro con el mismo ${unique.toUpperCase()}.`);return;}
    if(module==='pacientes' && record.f_nac>today){notify('La fecha de nacimiento no puede ser futura.');return;}
    if(module==='usuarios'){
      if(record.password && !/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(record.password)){notify('La contraseña requiere al menos 8 caracteres, letras y números.');return;}
      // Passwords are only simulated and never written to localStorage.
      delete record.password;record.ultimo_acceso=update?db.usuarios.find(u=>u.id_usuario===selected).ultimo_acceso:'Sin acceso';
    }
    if(module==='citas'){
      const m=doctor(record.id_medico);const specialty=db.especialidades.find(e=>e.nombre===record.especialidad);
      if(!m || m.especialidad!==record.especialidad){notify('Selecciona un médico de la especialidad indicada.');return;}
      const clash=db.citas.some(c=>c.id_cita!==selected && c.fecha===record.fecha && c.estado!=='Cancelada' && (c.id_medico===record.id_medico || c.id_paciente===record.id_paciente) && overlaps(c.hora,record.hora,Number(specialty?.duracion_consulta)||30));
      if(record.estado!=='Cancelada' && clash){notify('El médico o el paciente ya tiene una cita en ese horario.');return;}
    }
    const old=update?{...db[module].find(r=>r[idField]===selected)}:null;
    if(update){record[idField]=selected;db[module][db[module].findIndex(r=>r[idField]===selected)]=record;}
    else {record[idField]=idFor(prefixes[module],Math.max(0,...db[module].map(r=>Number(r[idField].split('-')[1])||0))+1);db[module].unshift(record);}
    if(module==='especialidades' && old && old.nombre!==record.nombre){db.medicos.forEach(m=>{if(m.especialidad===old.nombre)m.especialidad=record.nombre;});db.citas.forEach(c=>{if(c.especialidad===old.nombre)c.especialidad=record.nombre;});}
    persist();$('#search').value='';page=1;clear();notify(update?'Cambios guardados correctamente.':'Registro creado correctamente.');
  }
  form.addEventListener('submit',e=>{e.preventDefault();save(false);});
  document.querySelector('[data-action="update"]').addEventListener('click',()=>save(true));
  document.querySelector('[data-action="clear"]').addEventListener('click',clear);
  document.querySelector('[data-action="cancel"]')?.addEventListener('click',()=>{if(!selected)return;const r=db.citas.find(c=>c.id_cita===selected);r.estado='Cancelada';persist();select(selected);notify('Cita cancelada. El turno vuelve a estar disponible.');});
  document.querySelector('[data-action="reset-password"]')?.addEventListener('click',()=>{if(!selected)return;$('#password').value='';$('#password').required=true;$('#password').focus();notify('Introduce una nueva clave y pulsa Modificar para simular el restablecimiento.');});
  draw();

  function setupReports(){
    let reportRows=[];let applied={};
    $('#inicio').value=today.slice(0,8)+'01';$('#fin').value=today;
    options($('#medico'),db.medicos,m=>m.id_medico,m=>fullName(m),'Todos los médicos');
    options($('#especialidad'),db.especialidades,e=>e.nombre,e=>e.nombre,'Todas las especialidades');
    function generate(){
      const inicio=$('#inicio').value,fin=$('#fin').value;
      if(inicio && fin && inicio>fin){notify('La fecha inicial debe ser anterior a la fecha final.');return;}
      applied={inicio,fin,medico:$('#medico').value,especialidad:$('#especialidad').value};
      const list=db.citas.filter(c=>(!inicio||c.fecha>=inicio)&&(!fin||c.fecha<=fin)&&(!applied.medico||c.id_medico===applied.medico)&&(!applied.especialidad||c.especialidad===applied.especialidad));
      $('#report-total').textContent=list.length;$('#report-attended').textContent=list.filter(c=>c.estado==='Atendida').length;$('#report-cancelled').textContent=list.filter(c=>c.estado==='Cancelada').length;
      const groups=new Map();list.forEach(c=>{const key=c.id_medico+'|'+c.especialidad;if(!groups.has(key))groups.set(key,{medico:fullName(doctor(c.id_medico)),especialidad:c.especialidad,attended:0,cancelled:0});const g=groups.get(key);if(c.estado==='Atendida')g.attended++;if(c.estado==='Cancelada')g.cancelled++;});
      reportRows=Array.from(groups.values()).map(r=>({...r,rate:r.attended+r.cancelled?`${(r.attended/(r.attended+r.cancelled)*100).toFixed(1)}%`:'—'}));
      $('#table-body').innerHTML=reportRows.map(r=>`<tr class="even:bg-slate-50/50">${[r.medico,r.especialidad,r.attended,r.cancelled,r.rate].map(cells).join('')}</tr>`).join('')||'<tr><td colspan="5" class="p-10 text-center text-slate-400">No hay citas en el periodo seleccionado.</td></tr>';
      $('#report-summary').textContent=`${inicio?dateLabel(inicio):'Desde el inicio'} — ${fin?dateLabel(fin):'Sin límite'} · ${list.length} citas · ${reportRows.length} grupos`;
    }
    $('#report-form').addEventListener('submit',e=>{e.preventDefault();generate();notify('Reporte actualizado.');});
    document.querySelector('[data-action="pdf"]').addEventListener('click',()=>{window.print();});
    document.querySelector('[data-action="excel"]').addEventListener('click',()=>{
      const rows=[['Médico','Especialidad','Citas Atendidas','Canceladas','% Cumplimiento'],...reportRows.map(r=>[r.medico,r.especialidad,r.attended,r.cancelled,r.rate])];
      const csv='\ufeff'+rows.map(row=>row.map(v=>'"'+String(v).replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"').join(';')).join('\r\n');
      const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download=`reporte-citas-${applied.inicio||'inicio'}-${applied.fin||'fin'}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Reporte descargado en CSV compatible con Excel.');
    });
    generate();
  }
})();
