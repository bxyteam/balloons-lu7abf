
function handleErr(msg, url, l) {
    var txt = "There was an error on this page.\n\n";
    txt += "Error: " + msg + "\n";
    txt += "URL: " + url + "\n";
    txt += "Line: " + l + "\n\n";
    txt += "Click OK to continue.\n\n";
    if (
        url.substring(0, 12) == "https://maps" ||
        msg.substring(11, 20) == "document." ||
        txt.indexOf("properties of null") > -1
    ) {
        alert(txt);
    } else {
        //  document.location.reload();
        alert(txt);
    }
    return true;
}

function getslot(banda, qrp) {
    //The transmit slot is first calculated as (channel % 5).
    //Then the start time in minutes past the hour, repeated every 10 minutes, is given by: 2 * ((txSlot + 2 * txBand) % 5);
    //txBand is: 0: 2200m, 1: 630m, 2: 160m, 3: 80m, 4: 60m, 5: 40m, 6: 30m, 7: 20m, 8: 17m, 9: 15m, 10: 12m, 11: 10m. 12: 6m, 13: 4m, 14: 2m
    var br = banda.replace(/on /, "");
    if (br == "2200m") {
        w = 0;
    }
    if (br == "630m") {
        w = 1;
    }
    if (br == "160m") {
        w = 2;
    }
    if (br == "80m") {
        w = 3;
    }
    if (br == "60m") {
        w = 4;
    }
    if (br == "40m") {
        w = 5;
    }
    if (br == "30m") {
        w = 6;
    }
    if (br == "20m") {
        w = 7;
    }
    if (br == "17m") {
        w = 8;
    }
    if (br == "15m") {
        w = 9;
    }
    if (br == "12m") {
        w = 10;
    }
    if (br == "10m") {
        w = 11;
    }
    if (br == "6m") {
        w = 12;
    }
    if (br == "4m") {
        w = 13;
    }
    if (br == "2m") {
        w = 14;
    }
    if (br == "All") {
        w = 7;
    }
    if (br == "All") {
        w = 7;
    }
    qrpv = qrp * 1;
    if (qrpv > 199 && qrpv < 400);
    {
        first = "1";
    }
    if (qrpv > 399 && qrpv < 600) {
        first = "Q";
    }
    if (qrpv < 200) {
        first = "0";
    }
    third = Math.floor((qrpv % 200) / 20);
    chan = first.toString() + third.toString();
    txSlot = Math.floor(qrpv % 5);
    startime = 2 * ((txSlot + 2 * w) % 5);
    startime = startime + 2;
    if (startime == 10) {
        startime = 0;
    }
    return { balloonid: chan, timeslot: startime };
}
function getqrp(qrp) {
    fcc = 14097000;
    if (typeof qrp != "undefined") {
        qrporig = qrp;
        if (qrp.length < 4) {
            if (formu.banda.value == "160m") {
                fcc = 1838000;
            }
            if (formu.banda.value == "80m") {
                fcc = 3569000;
            }
            if (formu.banda.value == "40m") {
                fcc = 7040000;
            }
            if (formu.banda.value == "30m") {
                fcc = 10140100;
            }
            if (formu.banda.value == "17m") {
                fcc = 18106000;
            }
            if (formu.banda.value == "15m") {
                fcc = 21096000;
            }
            if (formu.banda.value == "12m") {
                fcc = 24926000;
            }
            if (formu.banda.value == "10m") {
                fcc = 28126000;
            }
            if (formu.banda.value == "6m") {
                fcc = 50294000;
            }
            if (formu.banda.value == "2m") {
                fcc = 144490400;
            }
        }
    }

    function getchannel(id, ts, fr) {
        for (chanx = 0; chanx < 600; chanx++) {
            chanx = (chanx + " ").replace(/ /, "");
            balloonid = getslot(formu.banda.value, chanx).balloonid;
            timeslot = getslot(formu.banda.value, chanx).timeslot;
            getchan(chanx);
            if (id == balloonid && ts == timeslot && fd == fr) {
                alert(
                    "For Id = " +
                    id +
                    ", Timeslot = " +
                    ts +
                    " and DeltaFrec = " +
                    fr +
                    ", U4B Channel = " +
                    chanx +
                    " " +
                    formu.banda.value,
                );
                break;
            }
        }
    }
    function getchan(qrp) {
        if (qrp > -1 && qrp < 600) {
        } else {
            alert(qrporig + " is not a Number from 0 to 599... Reenter...");
            return;
        }
        if (qrp < 200) {
            c1 = "0";
        }
        if (qrp > 199 && qrp < 400) {
            c1 = "1";
        }
        if (qrp > 399) {
            c1 = "Q";
        }
        resto = qrp.slice(-2) * 1;
        c2 = Math.floor(resto / 20)
            .toFixed(0)
            .slice(-1);
        if (qrp < 200 && qrp > 99) {
            c2 = c2 * 1 + 5;
        }
        if (qrp > 199 && qrp < 400 && qrp > 299) {
            c2 = c2 * 1 + 5;
        }
        if (qrp > 400 && qrp > 499) {
            c2 = c2 * 1 + 5;
        }
        r1 = qrp.slice(-1) * 1;
        if (r1 == 1 || r1 == 6) {
            c3 = "2";
        }
        if (r1 == 0 || r1 == 5) {
            c3 = "0";
        }
        if (r1 == 4 || r1 == 9) {
            c3 = "8";
        }
        if (r1 == 3 || r1 == 8) {
            c3 = "6";
        }
        if (r1 == 2 || r1 == 7) {
            c3 = "4";
        }
        if (formu.banda.value == "10m") {
            c3 = c3 - 4;
            if (c3 < 0) {
                c3 = c3 + 10;
            }
        }
        if (formu.banda.value == "12m") {
            c3 = c3 - 8;
            if (c3 < 0) {
                c3 = c3 + 10;
            }
        }
        if (formu.banda.value == "15m") {
            c3 = c3 - 2;
            if (c3 < 0) {
                c3 = c3 + 10;
            }
        }
        if (formu.banda.value == "17m") {
            c3 = c3 - 6;
            if (c3 < 0) {
                c3 = c3 + 10;
            }
        }
        if (formu.banda.value == "30m") {
            c3 = c3 - 4;
            if (c3 < 0) {
                c3 = c3 + 10;
            }
        }
        if (formu.banda.value == "40m") {
            c3 = c3 - 8;
            if (c3 < 0) {
                c3 = c3 + 10;
            }
        }
        if (formu.banda.value == "80m") {
            c3 = c3 - 2;
            if (c3 < 0) {
                c3 = c3 + 10;
            }
        }
        modulo = Math.floor((qrp % 20) / 5);
        if (modulo == 0) {
            fd = 20;
        }
        if (modulo == 1) {
            fd = 60;
        }
        if (modulo == 2) {
            fd = 140;
        }
        if (modulo == 3) {
            fd = 180;
        }
    }
    if (typeof qrp != "undefined") {
        if (qrp.indexOf(",") != -1) {
            qrpm = qrp.split(/,/);
        } else {
            qrpm = " ";
        }
        if (qrpm.length == 1) {
            if (isNaN(qrp)) {
                alert(qrporig + " is not a Number from 0 to 599... Reenter...");
                return;
            }
            if (qrp > -1 && qrp < 600) {
            } else {
                alert(qrp + " is not a Number from 0 to 599... Reenter...");
                return;
            }
            getchan(qrp);
            loque = window.confirm(
                "U4B Channel:" +
                qrporig +
                "  Id:" +
                c1 +
                c2 +
                " , Timeslot:" +
                c3 +
                ", Central Frec:" +
                (fcc * 1 + fd * 1) +
                " Hz +/-20Hz\n\n  Do you want to set or change and use these values on current run ?",
            );
            if (loque) {
                formu.balloonid.value = c1 + c2;
                formu.timeslot.value = c3;
                document.getElementById("qrpchn").innerHTML = qrporig + "?";
                qrpchange = true;
                setid();
            } else {
                alert("       VALUES NOT CHANGED !");
            }
        } else {
            if (qrpm.length == 3) {
                ch = qrpm[0].toUpperCase();
                ts = qrpm[1];
                fr = qrpm[2];
                sd = ch.substring(1, 2);
                if (
                    ch.substring(0, 1) == "0" ||
                    ch.substring(0, 1) == "1" ||
                    (ch.substring(0, 1) == "Q" &&
                        sd <= "9" &&
                        (ts == "0" || ts == "2" || ts == "4" || ts == "6" || ts == "8") &&
                        (fr == "20" || fr == "60" || fr == "140" || fr == "180"))
                ) {
                    getchannel(ch, ts, fr);
                } else {
                    alert(
                        "Channel " +
                        qrpm[0] +
                        " or tslot " +
                        ts +
                        " or deltafrec " +
                        fr +
                        " invalid.. reenter..",
                    );
                }
            }
        }
    } else {
        if (gqs("banda")) {
            bandacalc = gqs("banda");
        } else {
            bandacalc = "20m";
        }
        canal = prompt(
            " ~ Following " +
            bandacalc +
            " calculations valid for QRPLABs and Traquito only ~\n\nChan-ID: 1st+3rd character of 2nd transmission 00~09, 10~19, Q0~Q9\n      Timeslot (one digit) is even start minute of second transmission\n\n  Enter Channel (000-599) gives Channel-ID, Timeslot and frequency" +
            "\n    Or enter ID, Timeslot, DeltaFrec 20,60,140,180 to get Channel-Id\n\n",
        );
        if (canal != null) {
            getqrp(canal);
        } else {
        }
    }
}

function showtelen() {
    posleft = screen.availWidth / 2 - 203;
    postop = screen.availHeight / 2 - 180;
    if (popupwin != null) {
        popupwin.close();
    }
    codata =
        '<\/head><body bgcolor="#172447" color="#ffffff" style="font-size:12px;font-family:Tahoma,Arial;font-weight:bold;color:#ffffff;"  onclick="self.close();")>';
    if (gqs("SSID") != "") {
        mas = "-" + gqs("SSID");
    }
    codata =
        codata +
        "<center><span style='font-size:16px;line-height:18px;'>" +
        gqs("other").toUpperCase() +
        mas +
        " comment and TELENs Coding<\/span><br><br><\/center>";
    codata = codata + decodeURIComponent(window.comentfull);
    codata = codata + "</br>";
    codata = codata + "<\/body><\/html>";
    var anchopantalla = 588;
    var altopantalla = 230;
    preferences =
        "toolbar=no,width=" +
        anchopantalla +
        "px,height=" +
        altopantalla +
        "px,center,margintop=0,top=" +
        postop +
        ",left=" +
        posleft +
        ",status=no,scrollbars=no,resizable=no,dependent=yes,z-lock=yes";
    if (popupwin != null) {
        popupwin.close();
    }
    popupwin = window.open("", "win1", preferences);
    popupwin.document.write(codata);
    popupwin.setTimeout("self.close()", 120000);
}
function setlaunch() {
    launchdatetime = gqs("launch");
    newdatetime = prompt(
        " Enter/change Launch Date/Time, actual: YYYYMMDDHHMMSS (z)",
        launchdatetime,
    );

    if (newdatetime == null) { return; }

    if (newdatetime == "") {
        alert("Launch Date/Time missing");
        setlaunch();
    }
    if (newdatetime.length != 14 || isNaN(newdatetime)) {
        alert("Launch Date/Time invalid");
        setlaunch();
    }
    if (
        newdatetime.substring(0, 4) < "2010" ||
        newdatetime.substring(0, 4) > "2100"
    ) {
        alert("Launch Year invalid");
        setlaunch();
    }
    if (
        newdatetime.substring(4, 6) < "01" ||
        newdatetime.substring(4, 6) > "12"
    ) {
        alert("Launch Month invalid");
        setlaunch();
    }
    if (
        newdatetime.substring(6, 8) < "01" ||
        newdatetime.substring(6, 8) > "31"
    ) {
        alert("Launch Day invalid");
        setlaunch();
    }
    if (
        newdatetime.substring(8, 10) < "00" ||
        newdatetime.substring(8, 10) > "24"
    ) {
        alert("Launch Hour invalid");
        setlaunch();
    }
    if (
        newdatetime.substring(10, 12) < "00" ||
        newdatetime.substring(10, 12) > "59"
    ) {
        alert("Launch Minute invalid");
        setlaunch();
    }
    if (
        newdatetime.substring(12, 14) < "00" ||
        newdatetime.substring(12, 14) > "59"
    ) {
        alert("Launch Second invalid");
        setlaunch();
    }
    querystring = "https://" + window.location.hostname + window.location.pathname;
    if (gqs("banda")) {
        querystring = querystring + "?banda=" + gqs("banda");
    } else {
        querystring = querystring + "?banda=20m";
    }
    if (gqs("other")) {
        querystring = querystring + "&other=" + gqs("other");
    } else {
        querystring = querystring + "&other=";
    }
    if (gqs("balloonid")) {
        querystring = querystring + "&balloonid=" + gqs("balloonid");
    } else {
        querystring = querystring + "&balloonid=";
    }
    if (gqs("timeslot")) {
        querystring = querystring + "&timeslot=" + gqs("timeslot");
    } else {
        querystring = querystring + "&timeslot" + "";
    }
    if (gqs("repito") == "on") {
        querystring = querystring + "&repito=on";
    }
    if (gqs("wide") == "on") {
        querystring = querystring + "&wide=on";
    }
    if (gqs("qp") == "on") {
        querystring = querystring + "&qp=on";
    }
    if (gqs("detail") == "on") {
        querystring = querystring + "&detail=on";
    }
    if (gqs("qrpid")) {
        querystring = querystring + "&qrpid=" + gqs("qrpid");
    }
    if (gqs("SSID")) {
        querystring = querystring + "&SSID=" + gqs("SSID");
    } else {
        querystring = querystring + "&SSID=";
    }
    querystring = querystring + "&launch=" + newdatetime;
    if (gqs("tracker")) {
        querystring = querystring + "&tracker=" + gqs("tracker");
    } else {
        querystring = querystring + "&tracker=";
    }

    // FIXME: this doesn't work
    //document.location.url = querystring; document.location.href = querystring;
}
function settracker() {
    if (gqs("tracker")) {
        oldtracker = gqs("tracker");
    } else {
        oldtracker = "";
    }
    if (gqs("tracker")) {
        seltracker = "Selected Tracker: " + gqs("tracker") + "\n";
    } else {
        seltracker = "";
    }
    newtracker = prompt(
        seltracker +
        "Trackers: wb8elk, qrplabs, traquito, lightaprs, zachtek1, yo3ict, orion, dl6ow, ab5ss, oshpark, bss99, 6locators\nEnter/change Tracker ",
        oldtracker,
    );
    if (!newtracker) {
        return;
    }
    if (!newtracker && gqs("tracker")) {
        newtracker = gqs("tracker");
    }
    if (newtracker == "lightaprs") {
        newtracker = "qrplabs";
    }
    querystring = "https://" + window.location.hostname + window.location.pathname;
    if (gqs("banda")) {
        querystring = querystring + "?banda=" + gqs("banda");
    } else {
        querystring = querystring + "?banda=20m";
    }
    if (gqs("other")) {
        querystring = querystring + "&other=" + gqs("other");
    } else {
        querystring = querystring + "&other=" + "";
    }
    if (gqs("balloonid")) {
        querystring = querystring + "&balloonid=" + gqs("balloonid");
    } else {
        querystring = querystring + "&balloonid=";
    }
    if (gqs("timeslot")) {
        querystring = querystring + "&timeslot=" + gqs("timeslot");
    } else {
        querystring = querystring + "&timeslot=" + "";
    }
    if (newtracker.toLowerCase() == "zachtek") {
        newtracker = "zachtek1";
    }
    if (gqs("repito") == "on") {
        querystring = querystring + "&repito=on";
    }
    if (gqs("wide") == "on") {
        querystring = querystring + "&wide=on";
    }
    if (gqs("qp") == "on") {
        querystring = querystring + "&qp=on";
    }
    if (gqs("detail") == "on") {
        querystring = querystring + "&detail=on";
    }
    if (gqs("SSID")) {
        querystring = querystring + "&SSID=" + gqs("SSID");
    } else {
        querystring = querystring + "&SSID=";
    }
    if (gqs("launch")) {
        querystring = querystring + "&launch=" + gqs("launch");
    } else {
        querystring = querystring + "&launch=";
    }
    querystring = querystring + "&tracker=" + newtracker;

    // FIXME: this doesn't work
    //document.location.url = querystring; document.location.href = querystring;
}

function setssid() {
    savessid = formu.SSID.value;
    newssid = prompt(
        "Actual SSID is " +
        formu.SSID.value +
        " ~ Enter new SSID ~ Or Cancel to keep " +
        formu.SSID.value,
    );
    if (newssid == null) {
        return;
    }
    if (isNaN(newssid)) {
        alert("SSID should be from 1 to 999");
        return;
    } else {
        if (newssid * 1 < 0 || newssid > 999) {
            alert("SSID should be from 1 to 999");
            return;
        }
    }
    formu.SSID.value = newssid;
    ssidchange = true;
    if (newssid != null) {
        setid();
    } else {
        formu.SSID.value = savessid;
    }
}
function gqs(nombre) {
    //Retrieve Document location and tear off the QueryString values for processing.
    var url = window.parent.document.location + "";
    q = url.split("?");
    if (q[1]) {
        //Get all Name/Value pairs from the QueryString
        var pairs = q[1].split("&");
        for (i = 0; i < pairs.length; i++) {
            //Get the Name from given Name/Value pair
            var keyval = pairs[i].split("=");
            if (keyval[0] == nombre) {
                //Get the Value from given Name/Value pair and set to the return ID
                var valor = keyval[1];
            }
        }
    }
    return valor;
}
function gourl(url) {
    if (location.host == "lu7aa.com.ar") {
        url = url.replace(/.org/, ".com.ar");
    }
    if (location.host == "localhost") {
        //url = url.replace(/wspr./, "wsprx.");
        url = url.replace(/lu7aa.org/, "localhost/lu7aa.org.ar");
    }
    //    if (url.indexOf("qrplabs") > 0 || url.indexOf("traquito") > 0) {url=url+"&qp=on"}
    window.parent.document.location.href = url;
}
Date.prototype.addHours = function (h) {
    this.setHours(this.getHours() + h);
    return this;
};

function logactivity(urlused) {
    var losMeses = "EneFebMarAbrMayJunJulAgoSetOctNovDic";
    husohoras = new Date().getTimezoneOffset() / 60;
    var ahora = new Date().addHours(husohoras);
    var ahora = ahora.addHours(-3);
    DiayMes =
        losMeses.substring(ahora.getMonth() * 3, ahora.getMonth() * 3 + 3) +
        "-" +
        ("0" + ahora.getDate()).slice(-2) +
        " ";
    if (ahora.getHours() < 10) {
        hora = "0" + ahora.getHours();
    } else {
        hora = ahora.getHours();
    }
    if (ahora.getMinutes() < 10) {
        min = "0" + ahora.getMinutes();
    } else {
        min = ahora.getMinutes();
    }
    horainicio = DiayMes + hora + ":" + min;
    huso = (husohoras * -1).toString();
    if (huso.substring(0, 1) != "-") {
        huso = "%2B" + huso;
    }

}


function setid() {
    var querystring = `${HOST_URL}${window.parent.window.location.pathname}`;
    querystring =
        querystring +
        "?banda=" +
        formu.banda.value +
        "&other=" +
        formu.other.value +
        "&balloonid=" +
        formu.balloonid.value +
        "&timeslot=" +
        formu.timeslot.value;

    if (querystring.indexOf("tracker") == -1) {
        if (formu.tracker.value != "") {
            querystring + "&tracker=" + formu.tracker.value;
        }
    }
    if (formu.repito) {
        querystring = querystring + "&repito=on";
    } else {
        querystring = querystring + "&repito=";
    }
    if (formu.wide && formu.wide.checked == true) {
        querystring = querystring + "&wide=on";
    } else {
        querystring = querystring + "&wide=";
    }
    if (formu.detail && formu.detail.checked == true) {
        querystring = querystring + "&detail=on";
    } else {
        querystring = querystring + "&detail=";
    }
    if (qrpchange) {
        querystring =
            querystring +
            "&qrpid=" +
            document.getElementById("qrpchn").innerHTML.replace("?", "");
    } else {
        if (gqs("qrpid")) {
            querystring = querystring + "&qrpid=" + gqs("qrpid");
        }
    }
    if (ssidchange) {
        querystring = querystring + "&SSID=" + newssid;
        if (newssid.length > 0 && gqs("repito") != "on") {
            querystring = querystring + "&repito=on";
        }
    } else {
        if (gqs("SSID")) {
            querystring = querystring + "&SSID=" + gqs("SSID");
        }
    }
    if (gqs("launch")) {
        querystring = querystring + "&launch=" + gqs("launch");
    } else {
    }
    if (qrpchange) {
        querystring = querystring + "&tracker=" + "traquito";
    } else {
        if (gqs("tracker")) {
            querystring = querystring + "&tracker=" + gqs("tracker");
        }
    }
    if (gqs("telen") && gqs("telen") == "on") {
        querystring = querystring + "&telen=on";
        formu.telen.checked = true;
    }
    if (gqs("qp") && gqs("qp") == "on") {
        querystring = querystring + "&qp=on";
    }
    const limit = document.getElementById("limit");
    if (limit.value != "") {
        querystring = querystring + "&limit=" + limit.value;
    }

    window.parent.window.location.href = querystring;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        setid,
        setssid,
        setlaunch,
        settracker,
        logactivity,
        gqs,
        addHours,
        gourl,
        gqs,
        showtelen,
        getchan,
        getchannel,
        getqrp,
        getslot
    };
}
