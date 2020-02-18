'use strict';

/*
Infusion equations from Palmer, 2017:
Initial Infusion Equation:
Tw = (.41/r)(T2 - T1) + T2

Mash Infusion Equation:
Wa = (T2 - T1)(.41G + Wm)/(Tw - T2)

where:
r = The ratio of water to grain
Wa = The amount of boiling water added
Wm = The total amount of water in the mash
T1 = The initial temperature of the mash
T2 = The target temperature of the mash
Tw = The actual temperature of the infusion water
G = The amount of grain in the mash
*/

const TD_CONSTANT = 0.41;
const MAX_RESTS = 5;
const L_PER_GAL = 3.785;

function get_grain_weight() {
    return parseFloat(document.getElementById('total_grain').value);
}

function get_batch_volume() {
    return parseFloat(document.getElementById('bat_vol').value);
}

function set_config(key,val) {
    document.getElementById(key).value = val;
}

function set_footer_good(row_id, is_good) {
    var row = document.getElementById(row_id);
    row.classList.remove('good');
    row.classList.remove('bad');
    row.classList.add(is_good ? 'good' : 'bad');
}

function set_footer_row(row_id, vol) {
    var row = document.getElementById(row_id);
    row.children[2].innerHTML = vol.toFixed(2);
    row.children[3].innerHTML = (vol/L_PER_GAL).toFixed(2);
}

function get_footer_vol(row_id) {
    var vol = parseFloat(document.getElementById(row_id).children[2].innerHTML);
    return isNaN(vol) ? 0 : vol;
}

function get_strike_temp(grain, wg_ratio, t1, t2) {
    return((TD_CONSTANT/wg_ratio) * (t2-t1) + t2);
}

function get_infusion_volume(grain, water, t1, t2, ti) {
    return((t2-t1) * (TD_CONSTANT*grain+water) / (ti-t2));
}

function add_rest() {
    var rests = document.getElementById('rests');
    var rest = document.createElement('tr');
    var input = document.createElement('input');
    var rest_list = rests.children;
    var rest_count = rest_list.length;
    
    if(rest_count >= MAX_RESTS)
        return;
    
    rest.setAttribute('data-rest-num', ''+rest_count);
    rest.onchange = mod_rest;
    
    input.type = 'number';
    input.step = '0.1';
    input.max = '80.0';
    
    if(rest_count > 0) {
        input.min = rest_list[rest_count-1].firstChild.value;
        input.value = input.min;
    } else {
        input.min = document.getElementById('t0').value;
        input.value = '68.0';
    }
    
    rest.appendChild(input);
    rests.appendChild(rest);
    
    add_infusion(rest_count);
    update_infusions(rest_list);
}

function add_infusion(idx) {
    var infusions = document.getElementById('infusions');
    var infusion = document.createElement('tr');
    var cols = document.getElementById('inf_cols').children.length;
    var i;
    
    for(i=0; i<cols; ++i)
        infusion.appendChild(document.createElement('td'));
    
    infusion.firstChild.innerHTML = ''+idx;
    infusions.appendChild(infusion);
}

function update_infusions(rest_list) {
    var infusions = document.getElementById('infusions').children;
    var grain = get_grain_weight();
    var wg_ratio = parseFloat(document.getElementById('wg_ratio').value);
    var t0 = parseFloat(document.getElementById('t0').value);
    var len = rest_list.length;
    var rest, t1, t2, ti, i, prev, water = 0, vol, infusion, cols;
    
    for(i=0; i<len; ++i) {
        rest = rest_list[i].firstChild;
        t2 = parseFloat(rest.value);
    
        if(i===0) {
            t1 = t0;
            ti = get_strike_temp(grain, wg_ratio, t1, t2);
        } else {
            prev = rest_list[i-1].firstChild;
            t1 = parseFloat(prev.value);
            ti = 100;
        }
        
        vol = get_infusion_volume(grain, water, t1, t2, ti)
        water += vol;
        cols = infusions[i].children;
        cols[1].innerHTML = ti.toFixed(2);
        cols[2].innerHTML = vol.toFixed(2);
        cols[3].innerHTML = (vol/L_PER_GAL).toFixed(2);
    }
    
    set_footer_row('total_infusion', water);
    update_sparge();
    update_total_vol();
}

function mod_rest(e) {
    var rest_num = parseInt(e.target.parentNode.getAttribute('data-rest-num'));
    var rests = document.getElementById('rests');
    var rest_list = rests.children;
    var rest_count = rest_list.length;
    
    if(rest_num < rest_count-1) {
        update_min(rest_list, rest_num);
    }
    
    update_infusions(rest_list);
}

function update_min(rests, start) {
    var i, len, input = rests[start].firstChild, min = parseFloat(input.value);
    
    for(i = start+1, len = rests.length; i<len; ++i) {
        input = rests[i].firstChild;
        input.min = min;
        if(parseFloat(input.value) < min)
            input.value = min;
        min = input.min;
    }
}

function del_rest() {
    var rests = document.getElementById('rests');
    
    if(rests.getElementsByTagName('tr').length === 0)
        return;
    
    rests.removeChild(rests.lastChild);
    del_infusion();
    update_infusions(rests.children);
}

function del_infusion() {
    var infusions = document.getElementById('infusions');
    
    if(infusions.getElementsByTagName('tr').length === 0)
        return;
    
    infusions.removeChild(infusions.lastChild);
}

function update_param() {
    update_infusions(document.getElementById('rests').children);
}

function update_grain_loss() {
    const LOSS_FACTOR = 1.04; /* L lost/kg of grain, according to BYO and Internet sources */
    
    set_footer_row('grain_loss', get_grain_weight()*LOSS_FACTOR);
    update_sparge();
}

function update_total_grain() {
    update_grain_loss();
    update_infusions(document.getElementById('rests').children);
}

function update_evap() {
    var boil_len, evap_rate, boil_loss;
    
    boil_len = parseFloat(document.getElementById('boil_len').value);
    evap_rate = parseFloat(document.getElementById('evap_rate').value);
    boil_loss = (boil_len/60)*evap_rate;
    
    set_footer_row('boil_loss', boil_loss);
    update_runoff();
}

function update_runoff() {
    const SHRINKAGE_COEFF = 0.96;
    var boil_loss, bat_vol, trub_loss;
    
    boil_loss = get_footer_vol('boil_loss');
    bat_vol = get_batch_volume();
    trub_loss = parseFloat(document.getElementById('trub_loss').value);
    
    set_footer_row('runoff_vol', (bat_vol/SHRINKAGE_COEFF)+boil_loss+trub_loss);
    update_sparge();
}

function update_sparge() {
    var runoff, grain_loss, eq_loss, infusion, total_vol_to_tun;
    
    runoff = get_footer_vol('runoff_vol');
    grain_loss = get_footer_vol('grain_loss');
    eq_loss = parseFloat(document.getElementById('eq_loss').value);
    infusion = get_footer_vol('total_infusion');
    
    total_vol_to_tun = runoff+grain_loss+eq_loss;
    
    set_footer_row('sparge', total_vol_to_tun-infusion);
    update_total_mash();
}

function update_total_mash() {
    var infusion, sparge;
    
    infusion = get_footer_vol('total_infusion');
    sparge = get_footer_vol('sparge');
    
    set_footer_row('total_mash', infusion+sparge);
}

function update_total_vol() {
    const GRAIN_DISPLACEMENT = 0.67; /* L/kg displaced, according to BYO */
    var grain, infusion, tun_vol, total_vol;
    
    grain = get_grain_weight();
    infusion = get_footer_vol('total_infusion');
    tun_vol = parseFloat(document.getElementById('tun_vol').value);
    total_vol = infusion+(grain*GRAIN_DISPLACEMENT);
    
    set_footer_row('total_vol', total_vol);
    set_footer_good('total_vol', total_vol<tun_vol);
}

function init_config(cfg) {
    set_config('wg_ratio', cfg.mash_thickness);
    set_config('t0', cfg.grain_temp);
    set_config('bat_vol', cfg.batch_volume);
    set_config('evap_rate', cfg.evaporation_rate);
    set_config('eq_loss', cfg.equipment_loss);
    set_config('trub_loss', cfg.trub_loss);
    set_config('tun_vol', cfg.mash_tun_volume);
}

function init() {
    var xhr;
    xhr = new XMLHttpRequest();
    
    xhr.addEventListener("load", function() {
        var cfg = JSON.parse(this.responseText);
        init_config(cfg);
        
        update_grain_loss();
        update_evap(); /* updates subsequent values as well */
        update_total_vol();
    });
    
    xhr.open("GET", "config.json");
    xhr.send();
}
