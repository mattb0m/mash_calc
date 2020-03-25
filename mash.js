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

/* constant definition for IDs referencing the HTML fields */
const keys = {
    GRAIN_MASS: 'total_grain',
    MASH_THICKNESS: 'wg_ratio',
    GRAIN_TEMP: 't0',
    BATCH_VOL: 'bat_vol',
    EVAP_RATE: 'evap_rate',
    BOIL_LEN: 'boil_len',
    EQUIP_LOSS: 'eq_loss',
    TRUB_LOSS: 'trub_loss',
    MASH_TUN_VOL: 'tun_vol',
    MASH_RESTS: 'rests',
    MASH_INFUSIONS: 'infusions',
    INFUSION_COLUMNS: 'inf_cols', /* ID should be removed */
    GRAIN_LOSS: 'grain_loss',
    BOIL_LOSS: 'boil_loss',
    RUNOFF_VOL: 'runoff_vol',
    TOTAL_INFUSION_VOL: 'total_infusion',
    SPARGE_VOL: 'sparge',
    TOTAL_MASH_WATER_VOL: 'total_mash',
    TOTAL_MASH_VOL: 'total_vol',
    TOTAL_HOPS: 'total_hops',
    HOPS_LOSS: 'hops_loss'
};

function set_config(key,val) {
    document.getElementById(key).value = val;
}

function get_config(key) {
    return parseFloat(document.getElementById(key).value);
}

/* get array of mash rests */
function get_mash_rests() {
    return document.getElementById(keys.MASH_RESTS).children;
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
    var rests = document.getElementById(keys.MASH_RESTS);
    var rest = document.createElement('tr');
    var input = document.createElement('input');
    var rest_list = get_mash_rests();
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
        input.min = document.getElementById(keys.GRAIN_TEMP).value;
        input.value = '68.0';
    }
    
    rest.appendChild(input);
    rests.appendChild(rest);
    
    add_infusion(rest_count);
    update_infusions(rest_list);
}

function add_infusion(idx) {
    var infusions = document.getElementById(keys.MASH_INFUSIONS);
    var infusion = document.createElement('tr');
    var cols = document.getElementById(keys.INFUSION_COLUMNS).children.length;
    var i;
    
    for(i=0; i<cols; ++i)
        infusion.appendChild(document.createElement('td'));
    
    infusion.firstChild.innerHTML = ''+(idx+1);
    infusions.appendChild(infusion);
}

function update_infusions(rests) {
    var infusions = document.getElementById(keys.MASH_INFUSIONS).children;
    var grain = get_config(keys.GRAIN_MASS);
    var wg_ratio = get_config(keys.MASH_THICKNESS);
    var t0 = get_config(keys.GRAIN_TEMP);
    var len = rests.length;
    var t1, t2, ti, i, water = 0, vol, infusion, cols;
    
    for(i=0; i<len; ++i) {
        t2 = parseFloat(rests[i].firstChild.value);
    
        if(i===0) {
            t1 = t0;
            ti = get_strike_temp(grain, wg_ratio, t1, t2);
        } else {
            t1 = parseFloat(rests[i-1].firstChild.value);
            ti = 100;
        }
        
        vol = get_infusion_volume(grain, water, t1, t2, ti)
        water += vol;
        cols = infusions[i].children;
        cols[1].innerHTML = ti.toFixed(2);
        cols[2].innerHTML = vol.toFixed(2);
        cols[3].innerHTML = (vol/L_PER_GAL).toFixed(2);
    }
    
    set_footer_row(keys.TOTAL_INFUSION_VOL, water);
    update_sparge();
    update_total_vol();
}

function mod_rest(e) {
    var rest_num = parseInt(e.target.parentNode.getAttribute('data-rest-num'));
    var rests = get_mash_rests();
    var rest_count = rests.length;
    
    if(rest_num < rest_count-1) {
        update_min(rests, rest_num);
    }
    
    update_infusions(rests);
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
    var rests = document.getElementById(keys.MASH_RESTS);
    
    if(rests.getElementsByTagName('tr').length <= 1)
        return;
    
    rests.removeChild(rests.lastChild);
    del_infusion();
    update_infusions(rests.children);
}

function del_infusion() {
    var infusions = document.getElementById(keys.MASH_INFUSIONS);
    
    if(infusions.getElementsByTagName('tr').length === 0)
        return;
    
    infusions.removeChild(infusions.lastChild);
}

function update_param() {
    update_infusions(get_mash_rests());
}

function update_grain_loss() {
    const LOSS_FACTOR = 1.04; /* L lost/kg of grain, according to BYO and Internet sources */
    
    set_footer_row(keys.GRAIN_LOSS, get_config(keys.GRAIN_MASS)*LOSS_FACTOR);
    update_sparge();
}

function update_total_grain() {
    update_grain_loss();
    update_infusions(get_mash_rests());
}

function update_evap() {
    var boil_len, evap_rate, boil_loss;
    
    boil_len = get_config(keys.BOIL_LEN);
    evap_rate = get_config(keys.EVAP_RATE);
    boil_loss = (boil_len/60)*evap_rate;
    
    set_footer_row(keys.BOIL_LOSS, boil_loss);
    update_runoff();
}

function update_runoff() {
    const SHRINKAGE_COEFF = 0.96;
    var boil_loss, bat_vol, trub_loss, hops_loss;
    
    boil_loss = get_footer_vol(keys.BOIL_LOSS);
    hops_loss = get_footer_vol(keys.HOPS_LOSS);
    bat_vol = get_config(keys.BATCH_VOL);
    trub_loss = get_config(keys.TRUB_LOSS);
    
    set_footer_row(keys.RUNOFF_VOL, ((bat_vol+trub_loss+hops_loss)/SHRINKAGE_COEFF)+boil_loss);
    update_sparge();
}

function update_sparge() {
    var runoff, grain_loss, eq_loss, infusion, total_vol_to_tun;
    
    runoff = get_footer_vol(keys.RUNOFF_VOL);
    grain_loss = get_footer_vol(keys.GRAIN_LOSS);
    eq_loss = get_config(keys.EQUIP_LOSS);
    infusion = get_footer_vol(keys.TOTAL_INFUSION_VOL);
    
    total_vol_to_tun = runoff+grain_loss+eq_loss;
    
    set_footer_row(keys.SPARGE_VOL, total_vol_to_tun-infusion);
    update_total_mash();
}

function update_total_mash() {
    var infusion, sparge;
    
    infusion = get_footer_vol(keys.TOTAL_INFUSION_VOL);
    sparge = get_footer_vol(keys.SPARGE_VOL);
    
    set_footer_row(keys.TOTAL_MASH_WATER_VOL, infusion+sparge);
}

function update_total_vol() {
    const GRAIN_DISPLACEMENT = 0.67; /* L/kg displaced, according to BYO */
    var grain, infusion, tun_vol, total_vol;
    
    grain = get_config(keys.GRAIN_MASS);
    infusion = get_footer_vol(keys.TOTAL_INFUSION_VOL);
    tun_vol = get_config(keys.MASH_TUN_VOL);
    total_vol = infusion+(grain*GRAIN_DISPLACEMENT);
    
    set_footer_row(keys.TOTAL_MASH_VOL, total_vol);
    set_footer_good(keys.TOTAL_MASH_VOL, total_vol<tun_vol);
}

function update_hops_loss() {
    /* (determined experimentally): hops_loss_rate = 0.4L absorbed by 28g/1oz, 0.0143L/g */
    const HOPS_LOSS_RATE = 0.0143;
    
    set_footer_row(keys.HOPS_LOSS, get_config(keys.TOTAL_HOPS)*HOPS_LOSS_RATE);
    update_runoff();
}

function init_config(cfg) {
    set_config(keys.MASH_THICKNESS, cfg.mash_thickness);
    set_config(keys.GRAIN_TEMP, cfg.grain_temp);
    set_config(keys.BATCH_VOL, cfg.batch_volume);
    set_config(keys.EVAP_RATE, cfg.evaporation_rate);
    set_config(keys.EQUIP_LOSS, cfg.equipment_loss);
    set_config(keys.TRUB_LOSS, cfg.trub_loss);
    set_config(keys.MASH_TUN_VOL, cfg.mash_tun_volume);
}

function init() {
    var xhr;
    xhr = new XMLHttpRequest();
    
    xhr.addEventListener("load", function() {
        var cfg = JSON.parse(this.responseText);
        init_config(cfg);
        
        update_grain_loss();
        update_hops_loss();
        update_evap(); /* updates subsequent values as well */
        update_total_vol();
        add_rest();
    });
    
    xhr.open("GET", "config.json");
    xhr.send();
}
