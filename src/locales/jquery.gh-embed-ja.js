/**
 * Embed widget Japanese localization strings.
 * Include after control script.
 */
(function ($) {
	if ($.ui && $.ui.ghEmbed.prototype.locale) {

		$.extend($.ui.ghEmbed.prototype.locale, {
			fiddle: "JsFiddle で表示",
			gitHubLink: "GitHub で表示",
			copyAll: "クリップボードへコピー",
			errorInit:  "エラーが発生しました。",
			errorContent: "データを取得するときにエラーが発生しました。"
		});

	}
})(jQuery);