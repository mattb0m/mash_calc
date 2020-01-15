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
    var grain = parseFloat(document.getElementById('total_grain').value);
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
    
    //document.getElementById('total_vol').children[1].innerHTML = TODO;
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