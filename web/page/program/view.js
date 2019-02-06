P = Class.create(P, {

	init: function() {

		this.view.content.className = 'loading';

		this.program = chinachu.util.getProgramById(this.self.query.id);

		this.onNotify = this.refresh.bindAsEventListener(this);
		document.observe('chinachu:schedule', this.onNotify);
		document.observe('chinachu:reserves', this.onNotify);
		document.observe('chinachu:recording', this.onNotify);
		document.observe('chinachu:recorded', this.onNotify);

		if (this.program === null) {
			this.timer.notFound = setTimeout(function () {
				window.location.hash = '!/dashboard/top/';
			}, 3000);

			return this;
		}

		this.initToolbar();
		this.draw();

		// ホットキー
		sakura.shortcut.add("Left", function () {
			try { $("program-view-link-to-prev").click(); } catch (e) {}
		});
		sakura.shortcut.add("Right", function () {
			try { $("program-view-link-to-next").click(); } catch (e) {}
		});

		return this;
	},

	deinit: function() {

		// ホットキー
		sakura.shortcut.remove("Left");
		sakura.shortcut.remove("Right");

		document.stopObserving('chinachu:schedule', this.onNotify);
		document.stopObserving('chinachu:reserves', this.onNotify);
		document.stopObserving('chinachu:recording', this.onNotify);
		document.stopObserving('chinachu:recorded', this.onNotify);

		this.app.view.mainBody.entity.style.backgroundImage = '';

		return this;
	},

	refresh: function() {

		this.app.pm.realizeHash(true);

		return this;
	},

	initToolbar: function _initToolbar() {

		var program = this.program;

		this.view.toolbar.add({
			key: null,
			ui : new sakura.ui.Button({
				label  : 'ルールを作成',
				icon   : './icons/regular-expression.png',
				onClick: function() {
					new chinachu.ui.CreateRuleByProgram(program.id);
				}
			})
		});

		if (program._isReserves) {
			if (program.isManualReserved) {
				this.view.toolbar.add({
					key: null,
					ui : new sakura.ui.Button({
						label   : '予約取消',
						icon    : './icons/cross-script.png',
						onClick: function() {
							new chinachu.ui.Unreserve(program.id);
						}
					})
				});
			} else {
				if (program.isSkip) {
					this.view.toolbar.add({
						key: null,
						ui : new sakura.ui.Button({
							label   : 'スキップの取消',
							icon    : './icons/tick-circle.png',
							onClick: function() {
								new chinachu.ui.Unskip(program.id);
							}
						})
					});
				} else {
					this.view.toolbar.add({
						key: null,
						ui : new sakura.ui.Button({
							label   : 'スキップ',
							icon    : './icons/exclamation-red.png',
							onClick: function() {
								new chinachu.ui.Skip(program.id);
							}
						})
					});
				}
			}
		} else {
			if (!program._isRecorded) {
				this.view.toolbar.add({
					key: null,
					ui : new sakura.ui.Button({
						label   : '手動予約',
						icon    : './icons/plus-circle.png',
						onClick: function() {
							new chinachu.ui.Reserve(program.id);
						}
					})
				});
			}
		}

		if (program._isRecording) {
			this.view.toolbar.add({
				key: null,
				ui : new sakura.ui.Button({
					label   : '録画中止',
					icon    : './icons/cross.png',
					onClick: function() {
						new chinachu.ui.StopRecord(program.id);
					}
				})
			});
		}

		if (program._isRecorded) {
			this.view.toolbar.add({
				key: null,
				ui : new sakura.ui.Button({
					label  : '削除',
					icon   : './icons/cross-script.png',
					onClick: function() {
						new chinachu.ui.RemoveRecordedProgram(program.id);
					}
				})
			});
		}

		if (program.recorded) {
			if (global.chinachu.status.feature.filer) {
				this.view.toolbar.add({
					key: 'download',
					ui : new sakura.ui.Button({
						label  : 'ダウンロード',
						icon   : './icons/disk.png',
						onClick: function() {
							new chinachu.ui.DownloadRecordedFile(program.id);
						}
					})
				});
			}

			if (global.chinachu.status.feature.streamer && !program.tuner.isScrambling) {
				this.view.toolbar.add({
					key: 'streaming',
					ui : new sakura.ui.Button({
						label  : 'ストリーミング再生',
						icon   : './icons/film-youtube.png',
						onClick: function() {
							new chinachu.ui.Streamer(program.id);
						}
					})
				});
			}
		}

		return this;
	},

	draw: function() {

		console.log(this.program);

		var program = this.program;

		this.view.content.className = 'ex';
		this.view.content.update();

		var titleHtml = program.flags.invoke('sub', /.+/, '<span class="flag #{0}">#{0}</span>').join('') + program.title;
		if (program.subTitle && program.title.indexOf(program.subTitle) === -1) {
			titleHtml += ' <span class="subtitle">' + program.subTitle + '</span>';
		}
		if (typeof program.episode !== 'undefined' && program.episode !== null) {
			titleHtml += ' <span class="episode">#' + program.episode + '</span>';
		}
		titleHtml += ' <span class="id">#' + program.id + '</span>';

		if (program.isManualReserved) {
			titleHtml = ' <span class="flag manual">手動</span>' + titleHtml;
		}

		if (program.isSkip) {
			titleHtml = ' <span class="flag skip">スキップ</span>' + titleHtml;
		}

		setTimeout(function() {
			this.view.title.update(titleHtml);
		}.bind(this), 0);

		if (program._isReserves) {
			if (program.isSkip) {
				new sakura.ui.Alert({
					title       : 'スキップ',
					type        : 'yellow',
					body        : 'この番組は自動録画予約されましたがスキップするように設定されています',
					disableClose: true
				}).render(this.view.content);
			} else if (program.isConflict) {
				new sakura.ui.Alert({
					title       : '競合',
					type        : 'red',
					body        : 'この番組は録画予約されていますが競合のため録画できない可能性があります',
					disableClose: true
				}).render(this.view.content);
			} else {
				new sakura.ui.Alert({
					title       : '予約済',
					type        : 'blue',
					body        : 'この番組は録画予約されています',
					disableClose: true
				}).render(this.view.content);
			}
		}

		if (program._isRecording) {
			new sakura.ui.Alert({
				title       : '録画中',
				type        : 'red',
				body        : program.recorded,
				disableClose: true
			}).render(this.view.content);
		}

		// create layout grid
		var container = flagrate.createElement("div", { "class": "container-fluid" }).insertTo(this.view.content);
		var r1 = flagrate.createElement("div", { "class": "row" }).insertTo(container);
		var r1L = flagrate.createElement("div", { "class": "col-md-8" }).insertTo(r1);
		var r1R = flagrate.createElement("div", { "class": "col-md-4" }).insertTo(r1);
		var r2 = flagrate.createElement("div", { "class": "row" }).insertTo(container);
		var r2F = flagrate.createElement("div", { "class": "col-md-12" }).insertTo(r2);

		var meta = new flagrate.Element('div', { 'class': 'program-meta' }).update(
			' &ndash; ' +
			dateFormat(new Date(program.end), 'HH:MM') +
			' (' + (program.seconds / 60) + '分間)<br>' +
			'<small><span class="label label-cat-' + program.category + '">' + program.category + '</span> ' +
			'<span class="label label-type-' + program.channel.type + '">' + program.channel.type + ': ' +
			'<a href="#!/search/top/skip=1&chid=' + program.channel.id + '/">' + program.channel.name + '</a></span>' +
			'</small>'
		).insertTo(r1L);

		meta.insert({ top:
			new chinachu.ui.DynamicTime({
				tagName: 'span',
				type   : 'full',
				time   : program.start
			}).entity
		});

		// 番組情報
		new flagrate.Element('p', { 'class': 'program-detail' }).update(
			program.detail
				.stripScripts().escapeHTML()
				.replace(/(https?:\/\/[\x21-\x7e]+)/gi, function (url) {
					// リンク
					return '<a href="' + url + '" target="_blank">' + url + '</a>';
				})
				.replace(/(ｈｔｔｐｓ?：／／[\uFF01-\uFF5E]+)/g, function (src) {
					// 全角を半角に直してリンク
					var url = src
						.replace(/(.)/g, function (s) {
							return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
						})
						.stripScripts().stripTags();
					return '<a href="' + url + '" target="_blank">' + src + '</a>';
				})
		).insertTo(r1L);

		new sakura.ui.Alert({
			title       : '完全なタイトル',
			type        : 'white',
			body        : program.fullTitle,
			disableClose: true
		}).render(r1L);

		if (program.command) {
			new sakura.ui.Alert({
				title       : '録画パラメーター',
				type        : 'white',
				body        : program.command,
				disableClose: true
			}).render(r1L);
		}

		if (program._isRecorded) {
			var alertRecorded = new sakura.ui.Alert({
				title       : '録画済',
				type        : 'green',
				body        : program.recorded,
				disableClose: true
			});
			this.view.content.insert({ top: alertRecorded.entity });

			new Ajax.Request('./api/recorded/' + program.id + '/file.json', {
				method: 'get',
				onSuccess: function(t) {

					if (this.app.pm.p.id !== this.id) return;

					new sakura.ui.Alert({
						title       : 'ファイルサイズ',
						type        : 'white',
						body        : (t.responseJSON.size / 1024 / 1024 / 1024 / 1).toFixed(2) + 'GB',
						disableClose: true
					}).render(r1L);

					// 録画済みサムネイル
					var imgurl = "./api/recorded/" + program.id + "/preview.jpg?width=480&height=270";

					flagrate.createElement("img", {
						"class": "img-thumbnail img-responsive",
						src: imgurl + "&pos=3"
					}).insertTo(r1R);

					flagrate.createElement("img", {
						"class": "img-thumbnail img-responsive",
						src: imgurl + "&pos=" + Math.floor(program.seconds / 2)
					}).insertTo(r1R);

					flagrate.createElement("img", {
						"class": "img-thumbnail img-responsive",
						src: imgurl + "&pos=" + (program.seconds - 3)
					}).insertTo(r1R);
				}.bind(this),
				onFailure: function(t) {

					if (this.app.pm.p.id !== this.id) return;

					if (t.status === 410) {
						var alert = new sakura.ui.Alert({
							type        : 'red',
							body        : 'この番組の録画ファイルは移動または削除されています',
							disableClose: true
						});
						alertRecorded.entity.insert({ after: alert.entity });

						this.view.toolbar.one('download').disable();
						this.view.toolbar.one('streaming').disable();
					}
				}.bind(this)
			});
		}

		if (program._isRecording) {
			// 録画中サムネイル
			var imgurl = "./api/recording/" + program.id + "/preview.jpg?width=480&height=270";

			flagrate.createElement("img", {
				"class": "img-thumbnail img-responsive",
				src: imgurl
			}).insertTo(r1R);
		}

		// pager
		var nav = flagrate.createElement("nav").insertTo(r2F);
		var pager = flagrate.createElement("ul", { "class": "pager" }).insertTo(nav);
		var programs = null;

		if (program._isRecorded) {
			programs = global.chinachu.recorded;
		} else if (program._isRecording) {
			programs = global.chinachu.recording;
		} else if (program._isReserves) {
			programs = global.chinachu.reserves;
		}

		if (programs !== null) {
			var prev = null;
			var next = null;

			for (var i = 0, l = programs.length; i < l; i++) {
				if (programs[i].id === program.id) {
					if (i >= 0) {
						prev = programs[i - 1];
					}
					if (i < l) {
						next = programs[i + 1];
					}
					break;
				}
			}

			var prevLi = flagrate.createElement("li", { "class": "previous" }).insertTo(pager);
			var nextLi = flagrate.createElement("li", { "class": "next" }).insertTo(pager);

			if (prev) {
				flagrate.createElement("a", {
					id: "program-view-link-to-prev",
					title: prev.fullTitle,
					href: "#!/program/view/id=" + prev.id + "/"
				})
					.insert("<span>&larr;</span> " + prev.title)
					.insertTo(prevLi);
			}
			if (next) {
				flagrate.createElement("a", {
					id: "program-view-link-to-next",
					title: next.fullTitle,
					href: "#!/program/view/id=" + next.id + "/"
				})
					.insert(next.title + " <span>&rarr;</span>")
					.insertTo(nextLi);
			}

			flagrate.createElement("p", {
				className: "muted"
			}).insert("ホットキー [ページ移動]: <code>←</code> / <code>→</code>").insertTo(r2F);
		}

		return this;
	}
});
