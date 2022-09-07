const NAVER_URL = "https://m.search.naver.com/p/csearch/ocontent/spellchecker.nhn?_callback=window.__jindo2_callback._spellingCheck_0&q=";
const SARAMIN_URL = "http://www.saramin.co.kr/zf_user/tools/spell-check?content=";

function selectText() 
{
    var selectionText = "";
    if (document.getSelection) 
    {
        selectionText = document.getSelection();
    } 
    else if (document.selection) 
    {
        selectionText = document.selection.createRange().text;
    }
    return selectionText;
}

// 맞춤법 검사기 클래스
var spellChecker = {
    url : null,
    parse : function() {
        return {
            text : null,
            count : -1,
            msg: ""
        };
    }
}

// 네이버 파싱
function parseForNaver(resp) {
    json_text = resp.replace("window.__jindo2_callback._spellingCheck_0(", "").replace(");", "");
    json_obj = JSON.parse(json_text);
    
    return {
        text : json_obj.message.result.html,
        count : json_obj.message.result.errata_count
    };
};

// Javascript의 replace는 첫 문자열만 교체하기 때문에 모든 문자열 교체를 위해 작성함.
function replaceAll(str, old_word, new_word) {
    return str.split(old_word).join(new_word);
}

// 사람인 파싱
function parseForSaramin(resp) {
    json_text = resp;
    json_obj = JSON.parse(json_text);
    
    result_with_replace = json_obj.result_text;

    let errorWord = null
    let candWord = null
    let msg = ""

    for (var i in json_obj.word_list) {
        
        errorWord = json_obj.word_list[i].errorWord
        candWord = json_obj.word_list[i].candWordList
        msg = json_obj.word_list[i].helpMessage
        if (msg) {
            msg = msg.trim().split("\n")

            if (msg.length > 0) {
                msg = msg[0]
            } else {
                msg = ""
            }
        }

        if (typeof candWord === "object") {
            if (candWord.length > 0) {
                candWord = json_obj.word_list[i].candWordList[0]
            } else {
                candWord = ""
            }
        }   

        result_with_replace = replaceAll(result_with_replace, errorWord, candWord)
    }
    
    return {
        text : result_with_replace,
        count : json_obj.result_cnt,
        msg: msg
    };
};

$(document).ready(function() {

    var keepResultHtml;
    var keepResultText;
    var Exception = [];
    
    var sc = Object.create(spellChecker);
    
    var client = new XMLHttpRequest();
    function run(origin_text, callback) {
        client.onreadystatechange = function () {
            if (client.readyState === XMLHttpRequest.DONE && client.status === 200) {
                
                var results = sc.parse(client.responseText);
                
                if ("function" === typeof callback) {
                    callback(
                        results.text,
                        results.count,
                        results.msg
                    );
                }
            }
        }
        
        sc.parse = parseForSaramin;
        sc.url = SARAMIN_URL + origin_text;
        
        client.open("GET", sc.url, true);
        client.send(null);
    }
    

    $("#check-button").click(function() {
        // 입력 값 획득
        var origin_text = $("#check-target").val();
        var $check_result_label = $('#check-result-label');

        var origin = origin_text.split(" ")

        for (var i = 0; i <= origin.length; i++)
        {
            if (Exception.includes(origin[i]))
            {
                origin[i] = "예외";
            }
        }

        origin_text = origin.join(" ");

        // 입력 값이 공백일 경우 처리
        if ("" == $.trim(origin_text)) {
            $('#check-result').text("");
            $('#check-result-msg').text("");
            $check_result_label.removeClass("badge-secondary badge-success badge-danger").addClass("badge-secondary");
            $check_result_label.text("교정 결과");
            return;
        }
        
        // 맞춤법 검사
        run(origin_text, function(result_html, error_count, help_message) {
            $('#check-result').html(result_html);
            $('#check-result-msg').html(help_message);
        
            if (0 < error_count) {
                $check_result_label.removeClass("badge-secondary badge-success badge-danger").addClass("badge-danger");
                $check_result_label.text("맞춤법이 틀렸습니다 (" + error_count + ")");
            }
            else {
                $check_result_label.removeClass("badge-secondary badge-success badge-danger").addClass("badge-success");
                $check_result_label.text("맞춤법이 정확합니다");
            }
        
            keepResultHtml = result_html;
            keepResultText = $('#check-result').text();
        });
    });
    
    $('#check-result').mouseenter(function () {
        if (keepResultText) {
            $('#check-result').html(keepResultText);
        }
    });

    $('#check-result').mouseleave(function () {
        if (keepResultHtml) {
            $('#check-result').html(keepResultHtml);
        }
    });

    
    $("#check-target").keypress(function(e) {
        if (e.keyCode == 13) {
            $("#check-button").click();
        }
    });

    chrome.runtime.getBackgroundPage(function(bgPage) {
        bgPage.executeInjectedScript(function(result) {
            if (!result.selText) {
                $('#check-target').attr({
                    "placeholder": "검사할 대상을 마우스로 드레그하거나, 여기에 직접 입력하여 맞춤법 검사를 할 수 있습니다. (단축키: 윈도우 Ctrl+Shift+E, 맥 Cmd+Shift+E)"
                }).focus();

                return;
            }

            $("#check-target").text(result.selText);
        });
    });
    
    $("#check-fs-link").click(function () {
        if (keepResultText) {
            window.open("popup_fs.html", "popup_window", "width=" + screen.availWidth + ", height=" + screen.availHeight + ", scrollbars=no");
        }
        else {
            $("#check-fs-link").text("맞춤법 검사를 먼저 해야 합니다");
        }
    });

    $("#option").click(function(){
        window.open("Image_Page.html", "width=" + screen.availWidth + ", height=" + screen.availHeight + ", scrollbars=no");
    });

    $("#Game_button").click(function(){
        window.open("Game.html", "width=" + screen.availWidth + ", height=" + screen.availHeight + ", scrollbars=no");
    });

    $("#EX-button").click(function(){
        window.open("Exception.html", "width=" + screen.availWidth + ", height=" + screen.availHeight + ", scrollbars=no");
    });
    $("#NEW-button").click(function(){
        window.open("New_word.html", "width=" + screen.availWidth + ", height=" + screen.availHeight + ", scrollbars=no");
    });

});


