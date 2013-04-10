var errBookmarks = [];
var commentBookmarks = [];
var lockedCodeBookmarks = [];
var requestNotificationBookmarks = [];
var errorIcons = [];
var widgets = [];
var markedText = [];
var sideComments = [];
var lockedCodes = [];
var requestNotificationCodes = [];

var refresh_prepare = 1;
var functions = [];
var parseId;

/////////////////////////////////////
/////////////////////////Tokbox Area
/////////////////////////////////////
var tokboxData = {
    "api_key" : "16861582",
    "api_secret" : "37bf9ac7337139b14ebffb17364e69fe84bfda8b"
};
var tokboxSession = {};

var VIDEO_WIDTH = 320;
var VIDEO_HEIGHT = 240;

var session;
var publisher;
var subscribers = {};

function connect() {
    session.connect(tokboxData.api_key, tokboxSession.token);
    $("#streamButton").attr("data-action", "startPublish");
    $("#streamButton").text("Publish");
}

function disconnect() {
    session.disconnect();
    $("#streamButton").attr("data-action", "startStream");
    $("#streamButton").text("Start");
}

// Called when user wants to start publishing to the session
function startPublishing() {
    if (!publisher) {
        $("#streamButton").attr("data-action", "stopPublish");
        $("#streamButton").text("Unpublish");
        var publisherDiv = document.createElement('div');
        // Create a div for the publisher to replace
        publisherDiv.setAttribute('id', 'vc-publisher');
        $("#video-chat>div.modal-body>div>div#localCast").append(publisherDiv);
        var publisherProps = {
            width : VIDEO_WIDTH,
            height : VIDEO_HEIGHT
        };
        publisher = TB.initPublisher(tokboxData, publisherDiv.id, publisherProps);
        // Pass the replacement div id and properties
        session.publish(publisher);
    }
}

function localNotify(message, type) {
    var options = {
        text : message,
        template : '<div class="noty_message"><span class="noty_text"></span><div class="noty_close"></div></div>',
        type : type,
        dismissQueue : true,
        layout : 'top',
        timeout : 3000,
        closeWith : ['button'],
        buttons : false
    };
    var ntfcn = noty(options);
}

function saveCodeXML(editor, ntfn) {
    //$("#syncing-status").html("Saving...");
    var sid = sessionStorage.getItem("docName");
    var project_name = sessionStorage.getItem('project');        
    var xmlDoc = codeToXML(editor);
    var url = '/project/' + project_name + '/saveXML';
    var date = new Date();

    $.post(url, {
        "owner" : now.user.user,
        "snapshot" : xmlDoc,
        "content" : editor.getValue(),            
        "shareJSId" : sid,
        "timestamp" : date,
    }, function(data) {
        if (ntfn)
            localNotify('Successfully saved the document.', 'success');
        //$("#syncing-status").html("Last saved on " + date.toLocaleString());
    }, 'json');
}

function stopPublishing() {
    if (publisher) {
        $("#streamButton").attr("data-action", "stopStream");
        $("#streamButton").text("Stop");
        session.unpublish(publisher);
    }
    publisher = null;
}

function sessionConnectedHandler(event) {
    // Subscribe to all streams currently in the Session
    for (var i = 0; i < event.streams.length; i++) {
        addStream(event.streams[i]);
    }
}

function streamCreatedHandler(event) {
    // Subscribe to the newly created streams
    for (var i = 0; i < event.streams.length; i++) {
        addStream(event.streams[i]);
    }
}

function streamDestroyedHandler(event) {
    // This signals that a stream was destroyed. Any Subscribers will automatically be removed.
    // This default behaviour can be prevented using event.preventDefault()
}

function sessionDisconnectedHandler(event) {
    // This signals that the user was disconnected from the Session. Any subscribers and publishers
    // will automatically be removed. This default behaviour can be prevented using event.preventDefault()
    publisher = null;
}

function connectionDestroyedHandler(event) {
    // This signals that connections were destroyed
}

function connectionCreatedHandler(event) {
    // This signals new connections have been created.
}

/*
 If you un-comment the call to TB.setLogLevel(), above, OpenTok automatically displays exception event messages.
 */
function exceptionHandler(event) {
    alert("Exception: " + event.code + "::" + event.message);
}

function addStream(stream) {
    // Check if this is the stream that I am publishing, and if so do not publish.
    console.log(stream.connection.connectionId + " joined me!");
    if (stream.connection.connectionId == session.connection.connectionId) {
        return;
    }
    var subscriberDiv = document.createElement('div');
    // Create a div for the subscriber to replace
    subscriberDiv.setAttribute('id', stream.streamId);
    // Give the replacement div the id of the stream as its id.
    $("#video-chat>div.modal-body>div>div#remoteCasts").append(subscriberDiv);
    var subscriberProps = {
        width : VIDEO_WIDTH / 2,
        height : VIDEO_HEIGHT / 2
    };
    subscribers[stream.streamId] = session.subscribe(stream, subscriberDiv.id, subscriberProps);
}

///////////////////Tokbox Area
//////////////////////////////
//////////////////////////////

function get_random_color() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

function parse(delay) {
    if (parseId) {
        window.clearTimeout(parseId);
    }

    parseId = window.setTimeout(function() {
        var code, options, result, el, str;

        // Special handling for regular expression literal since we need to
        // convert it to a string literal, otherwise it will be decoded
        // as object "{}" and the regular expression would be lost.
        function adjustRegexLiteral(key, value) {
            if (key === 'value' && value instanceof RegExp) {
                value = value.toString();
            }
            return value;
        }

        if ( typeof window.editor === 'undefined') {
            code = document.getElementById('home').value;
        } else {
            code = myCodeMirror.getValue();
        }
        options = {
            comment : false,
            raw : false,
            range : false,
            loc : true,
            tolerant : true
        };

        try {

            result = esprima.parse(code, options);
            str = JSON.stringify(result, adjustRegexLiteral, 4);
            options.tokens = true;
            // document.getElementById('tokens').value = JSON.stringify(esprima.parse(code, options).tokens,
            // adjustRegexLiteral, 4);
            // updateTree(result);
        } catch (e) {
            //updateTree();
            str = e.name + ': ' + e.message;
        }

        // el = document.getElementById('syntax');
        // el.value = str;

        // el = document.getElementById('url');
        // el.value = location.protocol + "//" + location.host + location.pathname + '?code=' + encodeURIComponent(code);
        // console.log(result);
        // extractFunctions(result, functions);

        parseId = undefined;
    }, delay || 811);
}

function extractFunctions(obj, functions) {
    if (obj.body.length === 0)
        return;
    for (var i = 0; i < obj.body.length; i++) {
        if (obj.body[i].type === 'FunctionDeclaration')
            functions.push(obj.body[i]);
        if ( typeof obj.body[i].body === 'undefined')
            continue;
        extractFunctions(obj.body[i], functions);
    }
}

function tempLoadXml() {
    var pname = sessionStorage['project'];    

    var url = '/project/' + pname + 'loadXML/';
    console.log(url);

    $.get({
        url : url,
        success : function(data) {
            return data;
        },
        async : false
    });
}

function checkRefresh() {
    // Get the time now and convert to UTC seconds
    var today = new Date();
    var now = today.getUTCSeconds();

    // Get the cookie
    var cookie = document.cookie;
    var cookieArray = cookie.split('; ');

    // Parse the cookies: get the stored time
    for (var loop = 0; loop < cookieArray.length; loop++) {
        var nameValue = cookieArray[loop].split('=');
        // Get the cookie time stamp
        if (nameValue[0].toString() == 'SHTS') {
            var cookieTime = parseInt(nameValue[1]);
        }
        // Get the cookie page
        else if (nameValue[0].toString() == 'SHTSP') {
            var cookieName = nameValue[1];
        }
    }

    if (cookieName && cookieTime && cookieName == escape(location.href) && Math.abs(now - cookieTime) < 5) {
        // Refresh detected

        // Insert code here representing what to do on
        // a refresh
        return true;

        // If you would like to toggle so this refresh code
        // is executed on every OTHER refresh, then
        // uncomment the following line
        // refresh_prepare = 0;
    } else {
        return false;
    }

    // You may want to add code in an else here special
    // for fresh page loads
}

function prepareForRefresh() {
    if (refresh_prepare > 0) {
        // Turn refresh detection on so that if this
        // page gets quickly loaded, we know it's a refresh
        var today = new Date();
        var now = today.getUTCSeconds();
        document.cookie = 'SHTS=' + now + ';';
        document.cookie = 'SHTSP=' + escape(location.href) + ';';
    } else {
        // Refresh detection has been disabled
        document.cookie = 'SHTS=;';
        document.cookie = 'SHTSP=;';
    }
}

function disableRefreshDetection() {
    // The next page will look like a refresh but it actually
    // won't be, so turn refresh detection off.
    refresh_prepare = 0;

    // Also return true so this can be placed in onSubmits
    // without fear of any problems.
    return true;
}

function updateHints(editor) {
    editor.operation(function() {
        for (var i = 0; i < errBookmarks.length; ++i) {
            $(errBookmarks[i].dom).remove();
        }

        errBookmarks.length = 0;
        errorIcons.length = 0;

        JSHINT(editor.getValue());
        for (var i = 0; i < JSHINT.errors.length; ++i) {
            var err = JSHINT.errors[i];
            if (!err)
                continue;
            var bm = addBookmarks("error", err.line, -1, editor);
            $(bm.dom).tooltip({
                title : err.line + ": " + err.reason,
                placement : "left"
            });
        }
    });
}

function lockCode(lockedCode, lcid, cm) {
    var mt = cm.markText(lockedCode.from, lockedCode.to, {
        className : "gooz",
        readOnly : true
    });
            
    $.each(mt.lines, function(i, line) {
        cm.addLineClass(line, "wrap", "lockedCodeMarker");
        var lcIcon = $("<div>").attr({"tabindex" : "-1", "id": lcid}).addClass("lockedCodeMarker-Icon").tooltip({
            title : "Code has been locked by " + lockedCode.who + "!"
        });
        cm.setGutterMarker(lockedCode.from.line + i, "CodeMirror-lockedCodeGutter", lcIcon.get(0));        
    });
    
    addBookmarks("lockedCode", lockedCode.from.line, lcid, cm);    
            
    markedText.push(mt);
    cm.setCursor(lockedCode.from);
    lockedCodes.push(lockedCode);

    saveCodeXML(myCodeMirror, false);
}


function requestNotification(requestNotificationCode, ntid, cm) {    
    var mt = cm.markText(requestNotificationCode.from, requestNotificationCode.to, {
        className : "chos",
        readOnly : true
    });
           
    $.each(mt.lines, function(i, line) {
        cm.addLineClass(line, "wrap", "notificationRequestMarker");
        var nfIcon = $("<div>").attr({"tabindex" : "-1", "id": ntid}).addClass("notificationRequestMarker-Icon").tooltip({
            title : "Notification has been requested by " + requestNotificationCode.who + "!"
        });
        cm.setGutterMarker(requestNotificationCode.from.line + i, "CodeMirror-requestNotificationGutter", nfIcon.get(0));        
    });
    
    addBookmarks("requestNotification", requestNotificationCode.from.line, ntid, cm);    
            
    markedText.push(mt);
    cm.setCursor(requestNotificationCode.from);
    requestNotificationCodes.push(requestNotificationCode);

    //saveCodeXML(myCodeMirror, false);
}

function arian(string, context) {
    return string.replace(/%\(\w+\)s/g, function(match) {
        return context[match.slice(2, -2)];
    });
}

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}
function escapeHTML(text) {
    var esc = text;
    var re = [[/&/g, "&amp;"], [/</g, "&lt;"], [/>/g, "&gt;"]];
    for (var i = 0, len = re.length; i < len; i++) {
        esc = esc.replace(re[i][0], re[i][1]);
    }
    return esc;
}

function listOptions(els, opts) {
    var str = "/*jshint ";
    for (var name in opts) {
        if (opts.hasOwnProperty(name)) {
            str += name + ":" + opts[name] + ", ";
        }
    }
    str = str.slice(0, str.length - 2);
    str += " */";
    els.append(str);
}

function editor(id, mode) {
    var _editor = CodeMirror.fromTextArea(id, {
        mode : mode,
        lineNumbers : true,
        lineWrapping : true,
        extraKeys : {
            "Ctrl-Space" : "autocomplete"
        },        
        autoCloseTags : true,
        matchBrackets : true,        
        autoCloseBrackets : true,
        onKeyEvent : function() {
            return zen_editor.handleKeyEvent.apply(zen_editor, arguments);
        },
        gutters : ["CodeMirror-commentsGutter", "CodeMirror-commentsiconsGutter", "CodeMirror-lockedCodeGutter", "CodeMirror-requestNotificationGutter", "CodeMirror-linenumbers"]
    });                       
    
    Inlet(_editor);

    return _editor;
}

function clearMarker(cm, type) {
    if (type === 'Error') {
        $.each(errBookmarks, function(i, errBookmark) {
            cm.removeLineClass(errBookmark.line - 1, "wrap", "errorMarker");
        });
    } else if (type === 'Comment') {
        $.each(commentBookmarks, function(i, commentBookmark) {
            cm.removeLineClass(commentBookmark.line - 1, "wrap", "commentMarker");
        });
    }
}

function addGutterError(dln, cm) {
    var errorMarker;
    var errorMarkerDom = $("<span>").addClass('CodeMirror-erroriconGutter').text("●");
    cm.setGutterMarker(dln - 1, "CodeMirror-errorGutter", $(errorMarkerDom).get(0));

    errorMarker.dom = errorMarkerDom;
    errorMarker.line = dln;

    errorIcons.push(errorMarker);
}

function _sortByLine(a, b) {
    var lineA = a.line;
    var lineB = b.line;

    return ((lineA < lineB) ? -1 : ((lineA > lineB) ? 1 : 0));
}

function _wherebookmark(dln) {
    var allBookmarks = errBookmarks.concat(commentBookmarks);
    allBookmarks = allBookmarks.sort(_sortByLine);

    for (var i = 0; i < allBookmarks.length; i++) {
        bkmrk = allBookmarks[i];
        if (bkmrk.line > dln) {
            if (i === 0)
                return i;
            return i;
        }
    }
    return -1;
}

function getLineByCID(cid) {
    var ln = $("#icon-" + cid).parent().parent().children()[0].innerHTML;
    if (ln !== undefined)
        return ln;
    return -1;
}

function getLineByLCID(lcid) {
    var ln = $("#" + lcid).parent().parent().children()[0].innerHTML;
    ;
    if (ln !== undefined)
        return ln;
    return -1;
}

function getLineByNTID(ntid) {
    var ln = $("#" + ntid).parent().parent().children()[0].innerHTML;
    ;
    if (ln !== undefined)
        return ln;
    return -1;
}

function getBookmarkPosition(ln) {
    var bookmarkHeight = $("#bookmarksArea").height();
    var editorHeight = myCodeMirror.lineCount();
    var mapPers = (bookmarkHeight) / (editorHeight);

    return mapPers * (ln);
}

function addBookmarks(type, dln, vid, cm) {
    var notError = false;
    var marker, className, bookmarks;

    var top = getBookmarkPosition(dln);

    if (type === 'error') {
        bookmarks = errBookmarks;
        className = "CodeMirror-bookmarksIconError";
        marker = "errorMarker";
    } else if (type === 'comment') {
        bookmarks = commentBookmarks;
        marker = "commentMarker";
        className = "CodeMirror-bookmarksIconComment";
        notError = true;
    } else if (type === 'lockedCode') {
        bookmarks = lockedCodeBookmarks;
        marker = "lockedMarker";
        className = "CodeMirror-bookmarksIconLockedCode";
        notError = true;
    } else if (type === 'requestNotification') {
        bookmarks = requestNotificationBookmarks;
        marker = "requestNotificationMarker";
        className = "CodeMirror-bookmarksIconRequestNotification";
        notError = true;
    }    
    var bookmark = $("<div>").attr("vid", vid).addClass(className).attr("data-line", dln).css("top", top).click(function(e) {
        var cname = $(this).attr("class").substring(24);
        var vid = $(this).attr("vid");
        var line = $(this).attr("data-line") - 1;
        if (cname === 'Comment')
            line = getLineByCID(vid) - 1;
        else if (cname === 'LockedCode')
            line = getLineByLCID(vid) - 1;
        else if (cname === 'RequestNotification')
            line = getLineByNTID(vid) - 1;    
        clearMarker(cm, cname);
        if (type !== 'lockedCode' && type !== 'requestNotification')
            cm.addLineClass(line, "wrap", marker);
        cm.setCursor({
            line : line,
            ch : 0
        });
    });

    var bookmarkObj = {
        line : dln,
        id : $(bookmark).attr("vid"),
        dom : bookmark,
        type : type
    };
    var index = _wherebookmark(dln);
    if (index === 0 && notError) {
        $("#bookmarksArea").prepend(bookmark);
    } else if (index !== -1 && notError)
        $("#bookmarksArea div:nth-child(" + index + ")").after(bookmark);
    else
        $("#bookmarksArea").append(bookmark);
    if (type !== 'error')
        bookmarks[bookmarkObj.id] = bookmarkObj;
    else
        bookmarks.push(bookmarkObj);
    return bookmarkObj;
}

function codeToXML(editor) {
    if (editor.getValue() === "")
        return "";
    var codeHTML = [];

    var rootDocument = $("<code>").attr("id", sessionStorage["docName"]);
    var codeDocument = editor.doc;
    codeDocument.iter(0, codeDocument.size, function(line) {
        codeHTML.push(line);
    });

    for (var index = 0; index < codeHTML.length; ) {
        var codeLine = codeHTML[index];
        if (typeof codeLine.gutterMarkers !== 'undefined') {            
            if (codeLine.gutterMarkers["CodeMirror-commentsGutter"] !== undefined) {
                var cid = $(codeLine.gutterMarkers["CodeMirror-commentsGutter"]).attr("id");
                var commentNode = $("<comment>").attr("id", cid).append($("<l>").text(codeLine.text));
                index++;
                $(rootDocument).append(commentNode);
                continue;
                //TODO: Comment in locked code
            } else if (codeLine.gutterMarkers["CodeMirror-lockedCodeGutter"] !== undefined) {
                var lid = $(codeLine.gutterMarkers["CodeMirror-lockedCodeGutter"]).attr("id");
                var lockedCodeNode = $("<lockedCode>").attr("id", lid);
                var codeText = "";
                var j = index, tempLine = codeLine;
                while (tempLine.gutterMarkers !== undefined && tempLine.gutterMarkers["CodeMirror-lockedCodeGutter"] !== undefined) {
                    $(lockedCodeNode).append($("<l>").text(tempLine.text));
                    j++;
                    if (j < codeHTML.length)
                        tempLine = codeHTML[j];
                    else
                        break;
                }
                index = j;

                $(rootDocument).append(lockedCodeNode);
                continue;
            } else if (codeLine.gutterMarkers["CodeMirror-requestNotificationGutter"] !== undefined) {
                var ntid = $(codeLine.gutterMarkers["CodeMirror-requestNotificationGutter"]).attr("id");
                var lockedCodeNode = $("<requestNotification>").attr("id", ntid);
                var codeText = "";
                var j = index, tempLine = codeLine;
                while (tempLine.gutterMarkers !== undefined && tempLine.gutterMarkers["CodeMirror-requestNotificationGutter"] !== undefined) {
                    $(lockedCodeNode).append($("<l>").text(tempLine.text));
                    j++;
                    if (j < codeHTML.length)
                        tempLine = codeHTML[j];
                    else
                        break;
                }
                index = j;

                $(rootDocument).append(lockedCodeNode);
                continue;
            }
            
        } else {
            var pureCodeNode = $("<pureCode>");
            var codeText = "";
            var j = index, tempLine = codeLine;
            while (typeof tempLine.gutterMarkers === 'undefined') {
                $(pureCodeNode).append($("<l>").text(tempLine.text));
                j++;
                if (j < codeHTML.length)
                    tempLine = codeHTML[j];
                else
                    break;
            }
            index = j;

            $(rootDocument).append(pureCodeNode);
        }
    }
    return $(rootDocument)[0].outerHTML;
}

function cleanSessionStorage() {
    try {
        sessionStorage.removeItem('project');
        sessionStorage.removeItem('docName');
    } catch(e) {
        console.log(e);
    } finally {

    }
}

function _logout(options) {
    var reason = options.reason;

    switch(reason) {
        case 'idle':
            cleanSessionStorage();
            now.changeProjectGroup(undefined);
            var notifMsg = now.user.name + " is offline!";
            ns.sendNotification(notifMsg, "error", false, 'e');
            //TODO: save current open document on the server, appropriate notification
            break;
        case 'logoutButton':
            cleanSessionStorage();
            now.changeProjectGroup(undefined);
            var notifMsg = now.user.name + " is offline!";
            ns.sendNotification(notifMsg, "error", false, 'e');
            //TODO: save current open document on the server, appropriate notification
            break;
        case 'windowClose':
            now.changeProjectGroup(undefined);
            var notifMsg = now.user.name + " is offline!";
            ns.sendNotification(notifMsg, "error", false, 'e');
            //save current open document on the server, appropriate notification
            break;
        case 'refresh':
            //save current open document on the server, appropriate notification
            break;
    }

    window.location.href = '/logout';
}

function reportFailure(report, cm) {
    
}

function reportSuccess(report) {
    
}

// function randomDocName (length) {
//   var chars, x;
//   if (!length) {
//     length = 10;
//   }
//   chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-=";
//   var name = [];
//   for ( x = 0; x < length; x++) {
//     name.push(chars[Math.floor(Math.random() * chars.length)]);
//   }
//   return name.join("");
// };

var cmPosition = {};

var templates = {
    error : '<a style="text-decoration:none;" data-line="%(line)s" href="javascript:void(0)">Line %(line)s, Character %(character)s</a>: ' + '<code>%(code)s</code><p style="color: #b94a48">%(msg)s</p>'
};

var editorMessage = {
    errorMessage : '<p style="color:#E62E00; text-align=center;">%(message)s</p>',
    successMessage : '<p style="color:#009933; text-align=center;">%(message)s</p>'
};

$.fn.usedWidth = function() {
    return $(this).width() + parseInt($(this).css("margin-left"), 10) + parseInt($(this).css("margin-right"), 10);
};

$.fn.usedHeight = function() {
    return $(this).height() + parseInt($(this).css("margin-top"), 10) + parseInt($(this).css("margin-bottom"), 10);
};

var layout = function() {
    var _height = document.documentElement.clientHeight - $(".navbar").height();
    $("#editor-area").height(_height);
    $("#right-items").height(_height - 52);
    $("#right-items>div").height(_height - 52);
    $(".tab-pane").css("height", "100%");    
    $("#editor-area").css("left", 10);
    $("#editor-area").css("width", document.documentElement.clientWidth - 30);
    $("#right-items").css("left", $("#editor-area").usedWidth() - 10);
    //Just in case
    $(".CodeMirror-wrap").height(_height);
};

$(window).resize(function() {
    layout();
    if ( typeof myCodeMirror !== 'undefined')
        myCodeMirror.refresh();
});

$(window).load(function() {
    var isRefresh = checkRefresh();
    if (isRefresh) {
        _logout({
            "reason" : "refresh"
        });
    }
});

window.onunload = function() {
    prepareForRefresh();
}

window.onbeforeunload = function(e) {
    _logout({
        "reason" : "windowClose"
    });
};

var idleModal;

$(document).ready(function() {
    sessionStorage.clear();
    sessionStorage.setItem("color", get_random_color());
    window.doc = null;
    window.pid = null;
    // TODO
    _hotkeysHandler();
    //15 minutes idle
    startIdleTimer(120);

    //Notification Setup

    var editor_contextmenu = [{
        'Add Comment' : {
            onclick : function(menuItem, menu) {                
                var cursor = myCodeMirror.coordsChar(cmPosition);

                createComment(cursor.line + 1, null, "You");
            },
            icon : "assets/img/comments-icon.png"
        },
        'Lock Code' : {
            onclick : function(menuItem, menu) {
                if (myCodeMirror.somethingSelected()) {
                    var lockedCode = {};
                    lockedCode.lcid = uuid.v4();
                    lockedCode.from = myCodeMirror.doc.sel.from;
                    lockedCode.to = myCodeMirror.doc.sel.to;
                    lockedCode.who = now.user.user;                    
                    lockedCode.timestamp = ts = new Date();
                    var tsstring = "On " + ts.toDateString() + " at " + ts.toLocaleTimeString();
                    lockedCode.tsstring = tsstring;
                    lockedCode.pname = sessionStorage['project'];
                    lockedCode.content = myCodeMirror.getRange(lockedCode.from, lockedCode.to);
                    lockCode(lockedCode, lockedCode.lcid, myCodeMirror);
                    now.sendLockedCode(lockedCode);
                }
            },
            icon : "assets/img/code-lock.png"
        },
        'Watch Code' : {
            onclick : function(menuItem, menu) {
                if (myCodeMirror.somethingSelected()) {
                    var notificationRequest = {};
                    notificationRequest.ntid = uuid.v4();
                    notificationRequest.from = myCodeMirror.doc.sel.from;
                    notificationRequest.to = myCodeMirror.doc.sel.to;
                    notificationRequest.who = now.user.user;
                    //TODO: multiple users                    
                    notificationRequest.timestamp = ts = new Date();
                    var tsstring = "On " + ts.toDateString() + " at " + ts.toLocaleTimeString();
                    notificationRequest.tsstring = tsstring;
                    notificationRequest.pname = sessionStorage['project'];                    
                    requestNotification(notificationRequest, notificationRequest.ntid, myCodeMirror);
                    now.sendNotificationRequest(notificationRequest);
                }                                            
            },
            icon : "assets/img/notifReq-icon.png"
        }
    }];
    
    var editor_contextmenuPrime = [{
        'Remove Comment' : {
            onclick : function(menuItem, menu) {                
                var cursor = myCodeMirror.coordsChar(cmPosition);
                //Remove Comment only by owner
            },
            icon : "assets/img/comments-icon.png"
        },
        'Unlock Code' : {
            onclick : function(menuItem, menu) {
                var cursor = myCodeMirror.coordsChar(cmPosition);
                //Unlock code by owner only
            },
            icon : "assets/img/code-lock.png"
        }
    }];
    
    ns.sendNotification = function(notyMsg, notyType, needRefresh, type) {
        now.sendNotification(notyMsg, notyType, needRefresh, type);
        return false;
    }

    now.receiveNotification = function(notyObj, needRefresh) {
        if (notyObj.senderId === now.core.clientId)
            return;
        var ntfcn = noty({
            text : notyObj.text,
            template : '<div class="noty_message"><span class="noty_text"></span><div class="noty_close"></div></div>',
            type : notyObj.type,
            dismissQueue : true,
            layout : 'bottomLeft',
            timeout : 5000,
            closeWith : ['button'],
            buttons : false,
        });

        if (needRefresh)
            refreshProjectTree();
    }
    function autoupdate(dom) {
        setTimeout(function() {
            $(dom).css('display', 'none');
            setTimeout(function() {
                $(dom).css('display', 'block');
                setTimeout(autoupdate(dom), 50);
            }, 600)
        }, 600)
    }

    function showOtherCursor(cursor, cm) {
        var cmCursor = {
            line : cursor.line,
            ch : cursor.ch
        };
        var cursorCoords = cm.cursorCoords(cmCursor);
        var cursorEl = document.createElement('pre');
        cursorEl.className = 'other-client';
        cursorEl.style.borderLeftWidth = '2px';
        cursorEl.style.borderLeftStyle = 'solid';
        cursorEl.innerHTML = '&nbsp;';
        cursorEl.style.borderLeftColor = cursor.color;
        cursorEl.style.height = (cursorCoords.bottom - cursorCoords.top) * 1.1 + 'px';
        var ua = $("<div>").css({
            "top" : "-" + (cursorEl.style.height / 2),
            "padding" : "3px",
            "display" : "none",
            "background-color" : cursor.color,
            "color" : "white",
            "font-size" : "11px"
        }).html(cursor.who);
        $(cursorEl).append(ua);
        setTimeout(autoupdate(cursorEl), 50);
        var time = 2500, timer;
        function handlerIn() {
            clearTimeout(timer);
            $($(cursorEl).find("div")).stop(true).show();
        }

        function handlerOut() {
            timer = setTimeout(function() {
                $($(cursorEl).find("div")).hide();
            }, time);
        }


        $(cursorEl).hover(handlerIn, handlerOut);
        cm.addWidget(cursor, cursorEl, false);
        return {
            clear : function() {
                var parent = cursorEl.parentNode;
                if (parent) {
                    parent.removeChild(cursorEl);
                }
            }
        };
    }

    var cursorsDom = {};
    now.receiveCursors = function(cursors) {
        $.each(cursors, function(cursor, index) {
            if (cursors[cursor].sid === now.core.clientId)
                return;
            if (cursorsDom[cursor])
                cursorsDom[cursor].clear();
            //console.log(cursors[cursor]);
            var mark = showOtherCursor(cursors[cursor], myCodeMirror);
            cursorsDom[cursor] = mark;
        });
    }

    now.receiveComment = function(comment, cid) {
        if (comment.sid === now.core.clientId) {
            return;
        }        
        appendComment(comment.cid, comment.content, comment.who, comment.line, comment.timestamp, false);
        
    }

    now.receiveLockedCode = function(lockedCode, sid) {
        if (sid === now.core.clientId)
            return;       
        lockCode(lockedCode, lockedCode.cid, myCodeMirror);
        
    }
    
    now.receiveNotificationRequest = function(requestNotification, sid) {
        if (sid === now.core.clientId)
            return;       
        requestNotification(requestNotification, requestNotification.ntid, myCodeMirror);
        
    }
    now.executePauseCommand = function(sid) {
        if (sid === now.core.clientId)
            return;        
        myCodeMirror.setOption("readOnly", true);        
    }

    now.executeResumeCommand = function(sid) {
        if (sid === now.core.clientId)
            return;        
        myCodeMirror.setOption("readOnly", false);        
    }
    

    function _augmentDocument(pname) {
        var url = "/project/" + pname + "/augment";

        $.get(url, function(data) {
            $.each(data.comments, function(index, comment) {
                appendComment(comment.commentId, comment.commentBody, comment.commentSender, comment.commentLineNumber, comment.commentTimestamp, true)
            });

            $.each(data.lockedCodes, function(index, lockedCode) {
                var lc = {};
                lc.lcid = lockedCode.lockedCodeId;
                lc.from = lockedCode.lockedCodeFrom;
                lc.to = lockedCode.lockedCodeTo;
                lc.who = lockedCode.lockedCodeOwner;
                lc.timestamp = lockedCode.lockedCodeTimestamp;
                lc.tsstring = lockedCode.lockedCodeTSString;
                lc.content = lockedCode.lockedCodeContent;

                lockCode(lc, lc.lcid, myCodeMirror);
            });
            
            $.each(data.notificationRequests, function(index, notificationRequest) {
                var nr = {};
                nr.ntid = notificationRequest.notificationRequestId;
                nr.from = notificationRequest.notificationRequestFrom;
                nr.to = notificationRequest.notificationRequestTo;
                nr.who = notificationRequest.notificationRequestOwner;
                nr.timestamp = notificationRequest.notificationRequestTimestamp;
                nr.tsstring = notificationRequest.notificationRequestTSString;                

                requestNotification(nr, nr.ntid, myCodeMirror);
            });

            now.stopTransaction();

            var waitingAutosave;
            var waitingLint;
            myCodeMirror.on("change", function(myCodeMirror, changeObj) {
                clearTimeout(waitingAutosave);
                waitingAutosave = setTimeout(saveCodeXML(myCodeMirror, false), 5000);

                updateCommentsLineNumber();
                updateLockedCodeLineNumber();
            });                                    
        });
    }

    function projectEditorCreator(sid) {
        //TODO:REVISIT
        var mixedMode = {
        name: "htmlmixed",
            scriptTypes: [
                {matches: /\/x-handlebars-template|\/x-mustache/i,
                       mode: null},
                {matches: /(text|application)\/(x-)?vb(a|script)/i,
                       mode: "vbscript"}]
        };

        var pname = sessionStorage["project"];
        var elem = document.getElementById('home');
        //Clean memory
        errBookmarks = [];
        commentBookmarks = [];
        lockedCodeBookmarks = [];
        errorIcons = [];
        widgets = [];
        markedText = [];
        sideComments = [];
        lockedCodes = [];
        requestNotificationCodes = [];
        //Clean memory
        var myCodeMirror = editor(elem, mixedMode);
        myCodeMirror.setOption("readOnly", "nocursor");           

        //Save current content to the database before openning new file
        var docName = sid;
        sessionStorage.setItem("docName", docName);

        var connection = sharejs.open(docName, 'text', function(error, newdoc) {
            if (doc !== null) {
                doc.close();
                doc.detach_codemirror();
            }

            doc = newdoc;

            if (error) {
                console.error(error);
                return;
            } else {
                doc.attach_codemirror(myCodeMirror);
                myCodeMirror.setOption("readOnly", false);
                
            }

            //Start a transaction by making other open editors readonly
            now.startTransaction();

            _augmentDocument(pname);
            //End transaction
        });

        if ($(".CodeMirror.CodeMirror-wrap").size() > 1) {
            $($(".CodeMirror.CodeMirror-wrap")[1]).remove();
        }
        //$(".CodeMirror-wrap").height($("#project").height());

        $(".CodeMirror-lines").mousedown(function(e) {
            if (e.which === 3) {
                cmPosition.left = e.clientX;
                cmPosition.top = e.clientY;
            }
        });
        
        // $(".CodeMirror-lines").hover(function(e) {
            // var cursor = myCodeMirror.coordsChar({left:e.clientX,top:e.clientY});
            // var wrapClass = myCodeMirror.getLineHandle(cursor.line).wrapClass;                                        
//             
            // $(".context-menu-shadow").remove();
            // $(".context-menu.context-menu-theme-vista").parents().eq(3).remove();
            // if(wrapClass !== undefined && wrapClass.indexOf("commentMarker") !== -1) {
                // $(".CodeMirror-lines").contextMenu(editor_contextmenuPrime, {
                    // theme : 'vista'
                // });                                   
            // }
            // else {
                // $(".CodeMirror-lines").contextMenu(editor_contextmenu, {
                    // theme : 'vista'
                // });
            // }
        // }); 
        
        $(".CodeMirror-lines").contextMenu(editor_contextmenu, {
            theme : 'vista'
        });
        
               

        $("#right-items").css("display", "block");
        $("#right-items>div").html("");

        //TODO:Share cursor positions
        /*myCodeMirror.on("cursorActivity", function() {
         var color = sessionStorage.getItem("color");
         var cursor = myCodeMirror.getCursor();
         cursor.color = color;
         cursor.sid = now.core.clientId;
         cursor.who = now.user.user;
         cursor.path = currentDocumentPath;
         now.syncCursors(cursor, now.user.clientId);
         });*/

        var user = username;
        window.myCodeMirror = myCodeMirror;
    }

    function checkQuality() {
        var options = {
            debug : true,
            forin : true,
            eqnull : true,
            noarg : true,
            noempty : true,
            eqeqeq : true,
            boss : true,
            loopfunc : true,
            evil : true,
            laxbreak : true,
            bitwise : true,
            strict : false,
            undef : true,
            curly : true,
            nonew : true,
            browser : true,
            devel : false,
            jquery : true,
            es5 : false,
            node : true
        };
        if (JSHINT(myCodeMirror.getValue(), options))
            reportSuccess(JSHINT.data());
        else
            reportFailure(JSHINT.data(), myCodeMirror);        
    }
   
    function getSelectedRange() {
        return {
            from : myCodeMirror.getCursor(true),
            to : myCodeMirror.getCursor(false)
        };
    }

    function autoFormatCode() {
        if (!myCodeMirror.somethingSelected()) {
            var lineCount = myCodeMirror.lineCount();
            var lastLineLength = myCodeMirror.getLine(lineCount - 1).length;
            myCodeMirror.setSelection({
                line : 0,
                ch : 0
            }, {
                line : lineCount,
                ch : lastLineLength
            });
        }
        var range = getSelectedRange();
        myCodeMirror.autoFormatRange(range.from, range.to);
    }

    function commentSelection(isComment) {
        var range;
        if (myCodeMirror.somethingSelected()) {
            if (isComment) {
                range = getSelectedRange();
                myCodeMirror.commentRange(isComment, range.from, range.to);
            } else {
                var selectedText = myCodeMirror.getSelection();
                if (/<!--[\s\S]*?-->/g.test(myCodeMirror.getSelection()) || /\/\*([\s\S]*?)\*\//g.test(myCodeMirror.getSelection())) {
                    range = getSelectedRange();
                    myCodeMirror.commentRange(false, range.from, range.to);
                }
            }
        }
    }       

    function startIdleTimer(idleTime) {
        var dialogHeader = "<button type='button' class='close' data-dismiss='modal'>×</button><p style='text-align:center;font-weight:bold;' class='text-error'>***Warning***</p><p></p>";
        var dialogContent = "<p>You were idle for more than " + idleTime / 60 + " minutes, and you are about to be logged out in <span id='dialog-countdown' class='text-error'></span> seconds!</p>";

        var dialogFooter = $("<div>").css({
            'text-align' : 'center'
        }).append($("<a href='#'>").attr({
            class : "btn btn-success"
        }).text("Keep Working").click(function() {
            $.idleTimeout.options.onResume.call(this);
        })).append($("<a href='#'>").attr({
            class : "btn btn-primary"
        }).css("margin", "5px 5px 6px").text("Loggoff").click(function() {
            saveCodeXML(myCodeMirror, true);
            $.idleTimeout.options.onTimeout.call(this);
        }));

        $(".idle.modal-header").html(dialogHeader);
        $(".idle.modal-body").html(dialogContent);
        $(".idle.modal-footer").html(dialogFooter);

        $.idleTimeout('#idleDialog', '#idleDialog', {
            warningLength : 10,
            idleAfter : idleTime,
            onTimeout : function() {
                saveCodeXML(myCodeMirror, true);
                _logout({
                    "reason" : "idle"
                });
            },
            onIdle : function() {
                $("#idleDialog").modal('show');
            },
            onResume : function() {
                $("#idleDialog").modal('hide');
            },
            onCountdown : function(counter) {
                var $countdown = $('#dialog-countdown');
                $countdown.html(counter);
                // update the counter
            }
        });
    }

    // TODO: put into configure function CodeMirror
    // var elem = document.getElementById("home");
    CodeMirror.commands.autocomplete = function(cm) {
        var mode = cm.getOption("mode");
        if (mode.name === "htmlmixed") {            
            CodeMirror.showHint(cm, CodeMirror.htmlHint);               
        }
    };

    layout();
    // TODO: remove after finished
    $.get('/project', {
        name : sessionStorage.getItem('project')
    }, function(data) {        
        $("#dialog").modal('hide');
    });

    $(".btn-logout").click(function() {
        _logout({
            "reason" : "logoutButton"
        });
    });

    $("a[data-action=editor-new-file]").click(function() {
        createFile(this);
    });
    $("a[data-action=editor-new-project]").click(function() {
        // TODO: pop up a window, asking user close/save current project
        _newProject();
    });

    $("a[data-action=editor-open-project]").click(function() {
        _openProject();
    });

    $("a[data-action=editor-close-project]").click(function() {
        _closeProject();
    });

    $("a[data-action=editor-share-code]").click(function() {
        var dialogHeader = "<button type='button' class='close' data-dismiss='modal'>×</button><p>Share via this link</p>";
        var project_name = sessionStorage.getItem("project");
        var doc_shareJSId = sessionStorage.getItem("docName");
        var dialogContent = $("<div>").append($("<p>").text(document.location.origin + "/" + project_name + "/" + doc_shareJSId)).append($("<p>").attr("margin-bottom", "5px").append($('<input>').attr({
            type : "text",
            id : "collaboratorEmail",
            placeholder : "Enter a valid username",
            width : "100%",
            required : true
        })));

        var dialogFooter = $("<div>").append($("<a>").attr({
            class : "btn",
            "data-dismiss" : "modal"
        }).text("Cancel")).append($("<a>").attr({
            class : "btn btn-primary"
        }).css('margin', '5px 5px 6px').text("Share").click(function() {
            //TODO: Send notification to user
        }));

        $("#dialog>div.modal-header").html(dialogHeader);
        $("#dialog>div.modal-body").html(dialogContent);
        $("#dialog>div.modal-footer").html(dialogFooter);
        $("#dialog").modal();
    });

    var users;

    function _openProject() {
        //TODO:REVISIT
        if ($(".CodeMirror.CodeMirror-wrap").size() > 1) {
            $($(".CodeMirror.CodeMirror-wrap")[1]).remove();
        }

        $.get('/project/list', function(projects) {
            var dialogHeader = "<button type='button' class='close' data-dismiss='modal'>×</button><p>Open Project</p>";
            var project_table = $('<table>').attr({
                'class' : 'table table-striped table-bordered'
            });
            project_table.html('<thead><tr><th>#</th><th>Project Name</th><th>Created On</th><th>Last Modified On</th></tr></thead>');
            var tbody = $('<tbody>');
            var tr;
            for (var i = 0; i < projects.length; i++) {
                var created_on = new Date(projects[i].created_on);
                var last_modified_on = new Date(projects[i].last_modified_on);
                var created_on_string = "On " + created_on.toLocaleString();
                var last_modified_on_string = "On " + last_modified_on.toLocaleString();
                tr = $('<tr>');
                tr.append($('<td>').html(i + 1)).append($('<td>').append($('<a>').attr('href', '#').append(projects[i].name).click(function() {
                    // TODO: pop up close alert
                    sessionStorage.setItem('project', $(this).text());
                    $.get('/project', {
                        name : sessionStorage.getItem('project')
                    }, function(data) {
                        //createJsTreeByJSON(data);
                        $("#dialog").modal('hide');

                        //TODO "Now" Group Change, Remove User From Old Group
                        now.changeProjectGroup(sessionStorage.getItem('project'), (TB.checkSystemRequirements() === TB.HAS_REQUIREMENTS));
                        projectEditorCreator(data.shareJSId);
                        //now.sayHi();
                    });
                }))).append($('<td>').html(created_on_string)).append($('<td>').html(last_modified_on_string));
                tbody.append(tr);
            }
            project_table.append(tbody);
            var dialogContent = project_table;
            $("#dialog>div.modal-header").html(dialogHeader);
            $("#dialog>div.modal-body").html(dialogContent);
            $("#dialog>div.modal-footer").html('');
            project_table.dataTable();
            $("#dialog").modal();
        });
    }


    now.updateList = function(users) {
        //TODO:REVISIT
        function getDocPathName(docPath) {
            if (docPath === 'undefined')
                return {
                    doc : "nothing...",
                    path : ""
                };
            var path = docPath.split("/");
            var doc = path.splice(path.length - 1);
            return {
                doc : doc[0],
                path : path.join("/")
            };
        }

        // $("#chat-users-list").html("");
        // var pname = sessionStorage.getItem('project');
        // $.each(users[pname], function(index, user) {
        // var docPath = getDocPathName(user.currentDocument);
        // var chatAvailabilityClass = user.videoChat ? "cu-status-available-video" : "cu-status-available";
        // var cuItem = $("<div>").attr("chat-user-id", user._id).addClass("cu-item").append($("<table>").css({
        // 'width' : '100%',
        // 'height' : '100%',
        // 'text-align' : 'center'
        // }).append($("<tr>").attr('align', 'center').append($("<td>").css('width', '40px').append($("<div>").addClass(chatAvailabilityClass))).append($("<td>").css("width", "20px").append("<img src=assets/img/silhouette.png></img>")).append($("<td>").css({
        // 'text-align' : 'left',
        // 'padding-left' : '5px'
        // }).attr('valign', 'middle').append($("<a>").css({
        // "font-weight" : "bold",
        // "font-size" : "12px"
        // }).text(user.user + " ").addClass("text-info")))).append($("<tr>").tooltip({
        // title : docPath.path,
        // placement : "bottom"
        // }).attr('align', 'left').append($("<td colspan='3'>").append($("<span>").css({
        // "font-size" : "10px"
        // }).addClass("text-warning").text("Editing " + docPath.doc)))));
        // $("#chat-users-list").append($("<li>").html(cuItem));
        // });
    }
    function _closeProject() {
        now.changeProjectGroup(undefined);
        $("#browser").html('');
        $("#editor-area>div.CodeMirror").remove();
        $("#editor-area>div.inlet_slider").remove();
        $("#editor-area>ul").html("").append($("<li>").append($("<a>").attr("href", "#")));
        $("#chat.tab-pane>table>tbody>tr>td>ul").html('');
        $("#right-items").css("display", "none");
        $("#right-items>div").html("");
        sessionStorage.clear();        
    }

    function _newProject() {
        //TODO:REVISIT
        if ($(".CodeMirror.CodeMirror-wrap").size() > 1) {
            $($(".CodeMirror.CodeMirror-wrap")[1]).remove();
        }

        var dialogHeader = "<button type='button' class='close' data-dismiss='modal'>×</button><p>New Project</p>";
        var dialogContent = '<input type="text" id="project_name" placeholder="Enter project name" width="100%" required/><br/><input type="text" id="users" width="100%" required/>';

        var dialogFooter = $("<div>").append($("<button>").attr({
            class : "btn",
            type : 'button',
            "data-dismiss" : "modal"
        }).text("Cancel")).append($("<button>").css('margin', '5px 5px 6px').attr({
            class : "btn btn-primary",
            type : 'submit'
        }).text("Create").click(function() {
            if ($("#dialog input").val() === "") {
                var error_msg = '<div class="alert alert-error">' + '<button class="close" data-dismiss="alert">×</button>' + "Please enter a valid name for your project." + "</div>";
                if (!$("#dialog .alert")[0])
                    $("#dialog").append(error_msg);
            } else {
                var project_name = $("#project_name").val();
                // save client
                sessionStorage.setItem('project', project_name);
                // post to server
                var users = $("#as-values-users_list").attr("value").split(",");
                users.pop();
                var sid = uuid.v4();
                $.post("/project/new", {
                    pname : project_name,
                    sid: sid,
                    users : users
                }, function() {
                    localNotify("Successfully created " + $("#project_name").val() + " project!", 'success');                    
                    projectEditorCreator(sid);
                });

                $("#dialog").modal('hide');

                //Notification
                var notifMsg = '<span style="text-align:justify"><a href="#" class="notification-user-a">' + now.user.user + '</a>' + ' has created a new project <a class="notification-project-a" href="#">' + sessionStorage.getItem('project') + '</a></span>';
                ns.sendNotification(notifMsg, "information", false, 'e');
            }
        }));
        $("#dialog>div.modal-header").html(dialogHeader);
        $("#dialog>div.modal-body").html(dialogContent);
        $("#dialog>div.modal-footer").html(dialogFooter);

        $("#users").autoSuggest("/users/list", {
            selectedItemProp : "user",
            searchObjProps : "name",
            selectedValuesProp : "user",
            selectionLimit : 5,
            startText : "Add user name here",
            asHtmlID : "users_list"
        });
        $("#dialog").modal();
    }

    function _hotkeysHandler() {
        var commandKey = "ctrl";
        var metaKey = "meta";
        var hotkeys = {
            NEW_FILE : commandKey + "+n",
            NEW_FOLDER : commandKey + "+n",
            NEW_PROJECT : commandKey + "+shift+n",
            OPEN_PROJECT : commandKey + "+o",
            CLOSE_PROJECT : commandKey + "+w",
            SAVE : commandKey + "+s",
            CUT : commandKey + "+x",
            COPY : commandKey + "+c",
            PASTE : commandKey + "+v",
            UNDO : commandKey + "+z",
            REDO : commandKey + "+shift+z",
            DELETE : "backspace",
            SELECT_ALL : commandKey + "+a",
            FIND : metaKey + "+f",
            FIND_NEXT : metaKey + "+g",
            FIND_PREVIOUS : metaKey + "+shift+g",
            REPLACE : metaKey + "+shift+f",
            ZOOM_IN : commandKey + "++",
            ZOOM_OUT : commandKey + "+-",
            ACTUAL_SIZE : commandKey + "+0",
            FULLSCREEN : "f11",
            COMMENT : commandKey + "+/",
            UNCOMMENT : commandKey + "+/",
            FORMAT_CODE : commandKey + "+l",
            CHECK_QUALITY : commandKey + "+shift+j",
            SHARE_CODE : commandKey + "+shift+s",
            ABOUT : commandKey + "+i"
        };

        $(document).bind('keyup', hotkeys.OPEN_PROJECT, function() {
            _openProject();
        });

        $(document).bind('keyup', hotkeys.NEW_PROJECT, function() {
            _newProject();
        });

        $(document).bind('keyup', hotkeys.FULLSCREEN, function() {
            _fullscreen();
        });

        $(document).bind('keyup', hotkeys.SAVE, function() {
            saveCodeXML(myCodeMirror, true);
        });
        //TODO: add all shortcuts/hotkeys
    }

    function _fullscreen() {
        document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
    }


    $("button[data-action=editor-livepreview-toggle]").click(function() {
        var live_preview_toggle = $("button[data-action=editor-livepreview-toggle]");
        var live_preview_toggle_icon = $("button[data-action=editor-livepreview-toggle] i");
        var ea_original_width = $("#editor-area").width();

        if (live_preview_toggle.attr("data-status") === 'off') {
            //TODO: Hide comment area on right and split editor area into two equal sections
            _toggleLiveView(true);

        } else {
            //TODO: Merge equal sections in editor area and show comments
            _toggleLiveView(false);

        }
    });

    //TODO: Chat Start
    // $('#chat-start').click(function() {
    // var pname = sessionStorage.getItem('project');
    // chatWith('GroupChat');
    // });

    function appendComment(commentId, commentBody, commentSender, commentLineNumber, commentTimestamp, remote) {
        if ($('#icon-' + commentId).size() === 0) {
            createComment(commentLineNumber, commentBody, commentSender, commentId, remote);
        }

        var ts = new Date(commentTimestamp);
        var tsstring = "On " + ts.toDateString() + " at " + ts.toLocaleTimeString();
        var content = commentBody;

        var commentItem = $('<div>').addClass('CodeMirror-commentitem').append($('<p>').css('margin', '2px').html($('<span>').css({
            'font-weight' : 'bold',
            'font-size' : '10px',
            'font-color' : '#3399FF'
        }).html(commentSender).append($('<span>').css({
            'font-weight' : 'normal',
            'font-size' : '10px'
        }).html(': ' + commentBody))).append($('<p>').css({
            'font-size' : '8px',
            'text-align' : 'left',
            'margin-bottom' : '-1px',
            'color' : '#A2C1E8'
        }).html(tsstring)));

        var commentContent = $('#' + commentId).find("table tbody tr div.commentContent");
        $(commentContent).append(commentItem);
    }

    function createComment(line, content, who, cid, remote) {
        var comment_id = cid ? cid : uuid.v1();
        var pname = sessionStorage.getItem('project');

        var commentIcon = $("<div>").attr({
            "id" : "icon-" + comment_id,
            "tabindex" : "-1"
        }).addClass("CodeMirror-commentsicons").tooltip({
            title : "Show Discussion!"
        });
        //Start transaction
        myCodeMirror.setGutterMarker(line - 1, "CodeMirror-commentsiconsGutter", commentIcon.get(0));
        //End transaction

        hideComments(parseInt(getLineByCID(comment_id), 10) - 1);

        if (!remote)
            myCodeMirror.addLineClass(parseInt(getLineByCID(comment_id), 10) - 1, 'wrap', 'commentMarker commentMarkerInvisible');
        var comment = $("<div>").attr({
            "id" : comment_id,
            "tabindex" : "-1"
        }).attr("editor-comment-isopen", !remote).html($("<table>").css({
            "width" : "100%",
            "height" : "100%"
        }).append($("<tbody>").append($("<tr>").append($("<td>").append($("<div>").addClass("commentContent")))).append($("<tr>").append($("<td>").attr("valign", "bottom").append($("<div>").addClass("commentEntry").append($("<input>").css({
            "margin" : "2px auto",
            "width" : "160px"
        }).attr({
            'placeholder' : 'Reply to this comment...',
            'type' : 'text'
        }).keydown(function(e) {
            if (e.which === 13) {

                var taggedUsers = [];
                content = $(this).val().split(' ');
                var ts = new Date();

                var finalContent = '';
                $.each(content, function(index, value) {
                    var tempATag;
                    if (value.indexOf('@') == 0) {
                        tempATag = '<a href="#" class="commentMentionTag">' + value.slice(1) + '</a>';
                        taggedUsers.push(value.slice(1));
                    } else
                        tempATag = value;
                    finalContent += (' ' + tempATag);
                });

                var nowComment = {};

                nowComment.content = finalContent;
                nowComment.who = now.user.user;
                nowComment.timestamp = ts;
                nowComment.TSString = 'Sent on ' + ts.toDateString() + ' at ' + ts.toLocaleTimeString();
                nowComment.taggedUsers = taggedUsers;                
                nowComment.cid = $($(this).parents()[5]).attr('id');
                nowComment.line = getLineByCID(nowComment.cid);
                nowComment.pname = pname;

                $(this).val('');
                appendComment(nowComment.cid, nowComment.content, nowComment.who, nowComment.line, nowComment.timestamp, false);
                now.sendComment(nowComment);
            }
        }))))))).addClass("comment");

        $($(comment).find("table>tbody>tr>td")[1]).find(".commentEntry>input").triggeredAutocomplete({
            source : "/users/mentionList",
            minLength : 2,
            allowDuplicates : false,
            trigger : "@",
            hidden : '#hidden_inputbox'
        });

        $(comment).click(function(e) {
            $($(comment).find("table>tbody>tr>td")[1]).find(".commentEntry>input").focus();
        });

        commentIcon.click(function(e) {
            var cid = $(this).attr('id');
            var comment = $("#" + cid.substring(5));

            if ($(comment).attr("editor-comment-isopen") === "true") {
                $(comment).attr("editor-comment-isopen", "false");
                myCodeMirror.removeLineClass(parseInt(getLineByCID(cid.substring(5)), 10) - 1, 'wrap', 'commentMarker');
                $(comment).hide(400);
                $(this).tooltip({
                    title : "Show Discussion!"
                });
                return false;
            }

            hideComments(parseInt(getLineByCID(cid.substring(5)), 10) - 1);

            $(this).tooltip({
                title : "Hide Discussion!"
            });
            myCodeMirror.addLineClass(parseInt(getLineByCID(cid.substring(5)), 10) - 1, 'wrap', 'commentMarker commentMarkerInvisible');
            $(comment).attr("editor-comment-isopen", "true");
            $(comment).show(400);

            $($(comment).find("table>tbody>tr>td")[1]).find(".commentEntry>input").focus();
        });

        var commentIconObg = {};
        commentIconObg.cid = comment_id;
        commentIconObg.commentDom = comment;
        commentIconObg.content = content;
        commentIconObg.lineNumber = parseInt(getLineByCID(comment_id), 10) - 1
        sideComments.push(commentIconObg);

        if(!remote)
            saveCodeXML(myCodeMirror, false);

        myCodeMirror.on("delete", function(cm, line) {
            cm.setGutterMarker(parseInt(getLineByCID(comment_id), 10) - 1, "CodeMirror-commentsiconsGutter", null);
        });

        myCodeMirror.setGutterMarker(parseInt(getLineByCID(comment_id), 10) - 1, "CodeMirror-commentsGutter", comment.get(0));
        //Add Bookmark
        var bm = addBookmarks("comment", parseInt(getLineByCID(comment_id), 10) - 1, comment_id, myCodeMirror);
        var ctext = (content === null) ? "" : commentIconObg.content;
        $(bm.dom).tooltip({
            title : ctext,
            placement : "left"
        });
        //set focus on entry
        if (!remote) {
            $(comment).show(400);
            $($(comment).find("table>tbody>tr>td")[1]).find(".commentEntry>input").focus();
        }
    };

    function updateCommentsLineNumber() {
        for (var i = 0; i < sideComments.length; i++) {
            var sc = sideComments[i];
            sc.lineNumber = parseInt(getLineByCID(sc.cid), 10) - 1;
            commentBookmarks[sc.cid].dln = sc.lineNumber;
            $(commentBookmarks[sc.cid].dom).attr("data-line", sc.lineNumber);
            $(commentBookmarks[sc.cid].dom).css("top", getBookmarkPosition(sc.lineNumber));

            var url = "/project/comment/" + sc.cid + "/updateLineNumber";
            $.post(url, {
                lineNumber : sc.lineNumber + 1
            }, function() {
            }, 'json');
        }

    }

    function updateLockedCodeLineNumber() {
        for (var i = 0; i < lockedCodes.length; i++) {
            var lockedCode = lockedCodes[i];
            var lcid = lockedCode.lcid;
            var newLineNumber = parseInt(getLineByLCID(lcid), 10) - 1;

            lockedCodeBookmarks[lcid].dln = newLineNumber;
            $(lockedCodeBookmarks[lcid].dom).attr("data-line", newLineNumber);
            $(lockedCodeBookmarks[lcid].dom).css("top", getBookmarkPosition(newLineNumber));

            var oldFromCh = lockedCode.from.ch;
            var oldToCh = lockedCode.to.ch;
            //Calculating new boundary
            var fromDiffTo = lockedCode.from.line - lockedCode.to.line;
            lockedCode.from = {
                line : newLineNumber,
                ch : oldFromCh
            };
            lockedCode.to = {
                line : newLineNumber + fromDiffTo,
                ch : oldToCh
            };
            //updating database
            var url = "/project/lockedCode/" + lcid + "/updateLineNumber";
            $.post(url, {
                from : lockedCode.from,
                to : lockedCode.to
            }, function() {
            }, 'json');
        }
    }

    function hideComments(ccid) {
        for (var i = 0; i < sideComments.length; i++) {
            var sco = sideComments[i];
            var lineNumber = parseInt(getLineByCID(sco.cid), 10) - 1;
            if (ccid !== sco.cid) {
                $(sco.commentDom).attr("editor-comment-isopen", "false");
                $(sco.commentDom).hide(200);
                myCodeMirror.removeLineClass(lineNumber, "wrap", 'commentMarker');
            }
        }
    }

    function blink(dom) {
        setTimeout(function() {
            $(dom).removeClass('icon-white');
            setTimeout(function() {
                $(dom).addClass('icon-white');
                setTimeout(blink(dom), 1000);
            }, 600)
        }, 600)
    }


    $("a[data-action=editor-videochat]").click(function() {
        if ($('#video-chat').css('display') === 'display')
            return;
        if ($('#videoChatPopOut').size() !== 0)
            $('#videoChatPopOut').remove();
        var dialogHeader = "<button type='button' id='videoChatPopIn' class='close' style='padding-top:5px'><i class='icon-resize-small'/></button><p align='center'>Video Chat</p>";
        $('#video-chat>div.modal-header').hover(function() {
            $(this).css('cursor', 'move');
        });

        var dialogContent = $("<div>").css("height", "370px").append($("<div id='localCast'>")).append($("<div id='remoteCasts'>"));
        var dialogFooter = $("<div>").append($("<a>").attr({
            class : "btn",
            "data-dismiss" : "modal"
        }).text("Close")).append($("<a>").attr({
            class : "btn btn-primary"
        }).css('margin', '5px 5px 6px').text("Start").attr({
            "id" : "streamButton",
            "data-action" : "startStream"
        }).click(function() {
            $.post('/webRTCchat/createSession', {
                api_key : tokboxData.api_key,
                api_secret : tokboxData.api_secret,
                pname : sessionStorage.getItem("project")
            }, function(data) {
                tokboxSession.sessionId = data.sessionId;
                tokboxSession.token = data.token;

                session = TB.initSession(tokboxSession.sessionId);
                // Initialize session

                // Add event listeners to the session
                session.addEventListener('sessionConnected', sessionConnectedHandler);
                session.addEventListener('sessionDisconnected', sessionDisconnectedHandler);
                session.addEventListener('connectionCreated', connectionCreatedHandler);
                session.addEventListener('connectionDestroyed', connectionDestroyedHandler);
                session.addEventListener('streamCreated', streamCreatedHandler);
                session.addEventListener('streamDestroyed', streamDestroyedHandler);

                if ($("#streamButton").attr("data-action") === "startStream") {
                    connect();
                    $($("#video-chat>div.modal-footer>div>a")[0]).addClass('disabled');
                } else if ($("#streamButton").attr("data-action") === "stopStream") {
                    disconnect();
                    $($("#video-chat>div.modal-footer>div>a")[0]).removeClass('disabled');
                } else if ($("#streamButton").attr("data-action") === "startPublish") {
                    startPublishing();
                    //$($("#video-chat>div.modal-footer>div>a")[0]).addClass('disabled');
                } else if ($("#streamButton").attr("data-action") === "stopPublish") {
                    stopPublishing();
                    //$($("#video-chat>div.modal-footer>div>a")[0]).removeClass('disabled');
                }
            });
        }));

        $("#video-chat>div.modal-header").html(dialogHeader);
        $("#video-chat>div.modal-body").html(dialogContent);
        $("#video-chat>div.modal-footer").html(dialogFooter);
        $("#video-chat").modal({
            backdrop : false,
            keyboard : false
        }).draggable({
            handle : '.modal-header'
        });

        $('#videoChatPopIn').click(function() {
            $("#video-chat").modal('hide');
            var width = (window.innerWidth > 0) ? window.innerWidth : screen.width;
            var videoChatPopOut = $("<button>").attr({
                type : 'button',
                id : 'videoChatPopOut'
            }).addClass('btn btn-warning').css({
                position : "absolute",
                "z-index" : 3000,
                top : "5px",
                left : width - 280,
                "-webkit-box-shadow" : "1px 1px 1px 1px #4C4C4C"
            }).html("<i class='icon-facetime-video'></i><p></p>").click(function() {
                $("#video-chat").modal({
                    backdrop : false,
                    keyboard : false
                }).draggable({
                    handle : '.modal-header'
                });
                $(this).remove();
            });
            document.body.appendChild(videoChatPopOut.get(0));

            setTimeout(blink($("#videoChatPopOut>i.icon-facetime-video")), 500);
        });
    });

    $("a[data-action=editor-find]").click(function() {
        CodeMirror.commands["find"](myCodeMirror);
    });

    $("a[data-action=editor-find-replace]").click(function() {
        CodeMirror.commands["replace"](myCodeMirror);
    });

    $("a[data-action=editor-find-next]").click(function() {
        CodeMirror.commands["findNext"](myCodeMirror);
    });
    $("a[data-action=editor-find-previous]").click(function() {
        CodeMirror.commands["findPrev"](myCodeMirror);
    });
    $("a[data-action=editor-comment-selected]").click(function() {
        commentSelection(true);
    });
    $("a[data-action=editor-uncomment-selected]").click(function() {
        commentSelection(false);
    });
    $("a[data-action=editor-format-selected-code]").click(function() {
        autoFormatCode();
    });
    $("a[data-action=editor-check-quality]").click(function() {
        checkQuality();
    });
    $("a[data-action=editor-enter-fullscreen]").click(function() {
        _fullscreen();
    });

    $("a[data-action=editor-save-document]").click(function() {
        saveCodeXML(myCodeMirror, true);
    });

    /*
     Tooltip
     */
    $(".left-splitter-collapse-button").tooltip({
        title : "Hide"
    });

    /*$(".right-splitter-collapse-button").tooltip({
     title : "Hide Comments"
     });*/

    $("button[data-action=editor-livepreview-toggle]").tooltip({
        title : "Turn Live Preview On!",
        placement : "bottom"
    });

    $("a[data-action=editor-console-toggle]").tooltip({
        title : "Show Console",
        placement : "left"
    });

    $("a[data-action=editor-console-clean]").tooltip({
        title : "Clean Console",
        placement : "left"
    });
});
