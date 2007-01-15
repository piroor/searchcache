if (!("mromarkhan" in window))
			window.mromarkhan = { gmail: { } };
mromarkhan.gmail.searchcache = 
{
	onclick : function(aEvent)
	{
		if (!aEvent.button > 1) return;

		var where = 'current';

		var tree         = document.getElementById('searchcache_sidebar_result');
		var currentIndex = tree.currentIndex; 
		var treechildren = document.getElementById('result_treechildren');
		var treeitem     = treechildren.childNodes[currentIndex];

		var middleclick  = aEvent && (
					aEvent.button == 1 ||
					(aEvent.button == 0 && (aEvent.ctrlKey || aEvent.metaKey))
				);

		if (middleclick) {
			const PREF = Components.classes["@mozilla.org/preferences-service;1"]
			                       .getService(Components.interfaces.nsIPrefBranch);
			var background = PREF.getBoolPref('browser.tabs.loadInBackground');
			if (aEvent.shiftKey) background = !background;
			where = 'tab-'+(background ? 'background' : 'foreground');
		}

		mromarkhan.gmail.searchcache.openCache(treeitem.getAttribute('searchcache'), where);
	},
	openCache : function(aURI, aWhereToOpen)
	{
		var uri = Components.classes["@mozilla.org/network/standard-url;1"].
			createInstance(Components.interfaces.nsIURI);
		uri.spec = aURI;

		if (uri.schemeIs("javascript") || uri.schemeIs("data")) 
		{
		
		}
		else
		{
			var b = window.parent.gBrowser;
			switch(aWhereToOpen)
			{
				default:
					b.loadURI(aURI);
					break;

				case 'tab':
				case 'tab-foreground':
					b.addTab(aURI);
					break;

				case 'tab-background':
					b.selectedTab = b.addTab(aURI);
					break;
			}
		}
	},
	doSearch : function()
	{
		var searchcachetext = document.getElementById('search-box');
		if(searchcachetext.value != null
		&& searchcachetext.value != '')
		{
			mromarkhan.gmail.searchcache.query = searchcachetext.value;
			mromarkhan.gmail.searchcache.searcharr = mromarkhan.gmail.searchcache
				.query.split(/\s+/g);
			mromarkhan.gmail.searchcache.counter = 0;
			mromarkhan.gmail.searchcache.treeCount = 0;
			mromarkhan.gmail.searchcache.useregex = document.getElementById("regex").checked;
			
			var aNsIRDFService = Components
				.classes["@mozilla.org/rdf/rdf-service;1"]
				.getService(Components.interfaces.nsIRDFService);

			var HiddenSearchCacheTree = document
				.getElementById("searchcache_sidebar_tree");
			if(HiddenSearchCacheTree.hidden = true)
			{
				HiddenSearchCacheTree.hidden = false;
				var globalHistory = Components.classes["@mozilla.org/browser/global-history;2"]
					.getService(Components.interfaces.nsIRDFDataSource);
				HiddenSearchCacheTree.database.AddDataSource(globalHistory);
			}
			mromarkhan.gmail.searchcache
				.treeCount = HiddenSearchCacheTree.treeBoxObject.view.rowCount;
			
			mromarkhan.gmail.searchcache.cacheBuilder = HiddenSearchCacheTree
				.builder
				.QueryInterface(Components.interfaces.nsIXULTreeBuilder);
			mromarkhan.gmail.searchcache.counter = 0;
			var treechildren = document.getElementById('result_treechildren');
			while (treechildren.hasChildNodes())
			{
				treechildren.removeChild(treechildren.lastChild);
			}	

			mromarkhan.gmail.searchcache.processSideTreeTimer = window.setTimeout(mromarkhan.gmail.searchcache.processSideTree,1);

			document.getElementById('stop-button-container').collapsed = false;
			document.getElementById('stop-button').disabled            = false;
		}
	},
	onsidebar_keypress : function(aEvent)
	{
		var aNsIPrefBranch = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefBranch);
		var astype = aNsIPrefBranch.getBoolPref('extensions.mromarkhan.searchcache.astype');
		if(astype)
		{
			mromarkhan.gmail.searchcache.doSearch();
		}
		else if(aEvent.keyCode == 13)
		{
			mromarkhan.gmail.searchcache.doSearch();
		}
	},
	
	processSideTree : function()
	{
		if(mromarkhan.gmail.searchcache.counter 
			< mromarkhan.gmail.searchcache.treeCount)
		{
			var aNsIPrefBranch = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefBranch);
			var maxlen = aNsIPrefBranch.getIntPref('extensions.mromarkhan.searchcache.strlen');
			var counter_label = document.getElementById('counter_label');
			counter_label.value = mromarkhan.gmail.searchcache.counter+1 + '/'+
				mromarkhan.gmail.searchcache.treeCount;
			mromarkhan.gmail.searchcache
				.resourceIndexed = mromarkhan.gmail.searchcache
				.cacheBuilder.getResourceAtIndex(
				mromarkhan.gmail.searchcache.counter);
			mromarkhan.gmail.searchcache.counter++;
			var url = mromarkhan.gmail.searchcache
				.resourceIndexed.Value;
			if (url)
			{
				try
				{
					var nsICacheService = Components.interfaces.nsICacheService;
					var cacheService = Components
						.classes["@mozilla.org/network/cache-service;1"]
						.getService(nsICacheService);
					var httpCacheSession = cacheService.createSession("HTTP",
						Components.interfaces.nsICache.STORE_ANYWHERE, true);
					httpCacheSession.doomEntriesIfExpired = false;
					var cacheEntryDescriptor = httpCacheSession.openCacheEntry(url,
						Components.interfaces.nsICache.ACCESS_READ, true);
					
					var nsIScriptableInputStream = Components.interfaces.nsIScriptableInputStream;
					var factory = Components.classes["@mozilla.org/scriptableinputstream;1"];
					var wrapper = factory.createInstance(nsIScriptableInputStream);
					var input = cacheEntryDescriptor.openInputStream(0);
					wrapper.init(input);
					var data = wrapper.read(wrapper.available());

					try {
						var visitor = mromarkhan.gmail.searchcache.cacheMetaDataVisitor;
						visitor.data = null;
						cacheEntryDescriptor.visitMetaData(visitor);
						var charset = visitor.data.charset;

						if (!charset) {
							var defcharset = aNsIPrefBranch.getCharPref('intl.charset.default');
							var part       = data.split(/<\/head>|<body( |>)/i)[0].replace(/[\n\r]+/g, ' ');
							charset    = part.match(/(^<\?xml.+encoding=['"]|<meta[^>]+http-equiv=['"]content-type['"][^>]+charset=['"][^;]*; *charset=)([^'"]+)[^>]*>/i) ?
										RegExp.$2 :
									(part.indexOf('<?xml') == 0) ?
										'UTF-8' :
										defcharset ;
						}

						if (charset) {
							const UConvID = '@mozilla.org/intl/scriptableunicodeconverter';
							const UConvIF  = Components.interfaces.nsIScriptableUnicodeConverter;
							const UConv = Components.classes[UConvID].getService(UConvIF);
							UConv.charset = charset;
							var converted = UConv.ConvertToUnicode(data);
							data = converted;
						}
					}
					catch(e) {
						dump(e+'\n');
					}

					var dataLowerCase = data.toLowerCase();
					var foundAll = true;
					/*
						handle - + inurl:
					*/
					if(mromarkhan.gmail.searchcache.useregex)
					{
						var regexp = eval(mromarkhan.gmail.searchcache.query);
						if(dataLowerCase.search(regexp) == -1)
						{
							foundAll = false;
						}
						else
						{
							var matches = dataLowerCase.match(regexp);
							if(matches != null && matches.length > 0)
							{
								mromarkhan.gmail.searchcache.str =matches[0];
							}
						}
					}
					else if(mromarkhan.gmail.searchcache.query.indexOf("\"") == 0
					&& mromarkhan.gmail.searchcache.query.lastIndexOf("\"") == (mromarkhan.gmail.searchcache.query.length - 1)
					&& mromarkhan.gmail.searchcache.query.length > 3)
					{
						
						var newQuery = mromarkhan.gmail.searchcache.query.substring(1,mromarkhan.gmail.searchcache.query.length-1);
						newQuery = newQuery.toLowerCase();
				
						var res = dataLowerCase.indexOf(newQuery);
						if(res == -1)
						{
							
							foundAll = false;
						}	
						else
						{
							var end = 0;
							end = newQuery.length + maxlen + res;
							mromarkhan.gmail.searchcache.str = data.substring(res,end);
							
						}
					}
					else if(mromarkhan.gmail.searchcache.searcharr.length == 1)
					{
						var word = mromarkhan.gmail.searchcache.searcharr[0].toLowerCase();
						var res = dataLowerCase.indexOf(word);
						if(res == -1)
						{
							foundAll = false;
						}	
						else
						{
							var end = 0;
							end = word.length + maxlen + res;
							mromarkhan.gmail.searchcache.str = data.substring(res,end);
						}
					}
					else
					{
						var strArray = [];
						var arrcount = mromarkhan.gmail.searchcache.searcharr.length;
						for(n in mromarkhan.gmail.searchcache.searcharr)
						{
							var word = mromarkhan.gmail.searchcache
								.searcharr[n].toLowerCase();
							var res = dataLowerCase.indexOf(word);
				
							if(word.indexOf('site:') == 0
							|| word.indexOf('inurl:') == 0
							|| word.indexOf('domain:') == 0
							|| word.indexOf('url:') == 0)
							{
								var colon = word.indexOf(':');
								var specurl = word.substring(colon+1,word.length);
								if(specurl != null || specurl != "")
								{

									if(url.indexOf(specurl) == -1)
									{
										foundAll = false;
										break;
									}
								}
								else
								{
									foundAll = false;
									break;
								}
	
							}
							/*(else if(word.indexOf('date:') == 0)
							{
								var aNsIRDFService = Components.classes["@mozilla.org/rdf/rdf-service;1"]
									 .getService(Components.interfaces.nsIRDFService);
									 
								var HiddenSearchCacheTree = document
											.getElementById("searchcache_sidebar_tree");
													var datePredicate 
									= aNsIRDFService.GetResource("http://home.netscape.com/NC-rdf#Date");
									var dateInt = 0;
								var dateStr = "";
								var dateRes  = HiddenSearchCacheTree.database
										.GetTarget(mromarkhan.gmail.searchcache.resourceIndexed, datePredicate, true);
								if(dateRes)
								{
									var dateLit = dateRes.QueryInterface(Components.interfaces.nsIRDFDate);
									dateStr = new Date(dateLit.Value/1000);
									 
								}
							}*/
							else if(res == -1)
							{
								foundAll = false;
								break;
							}	
							else
							{
								var end = 0;
								end = word.length + parseInt(maxlen/arrcount) + res;
								strArray.push(data.substring(res,end));
							}
						}
						mromarkhan.gmail.searchcache.str = strArray.join('...');
					}
				}
				catch(exce)
				{
//					dump(url+'\n'+exce+'\n');		            
				}
				if(foundAll)
				{
					mromarkhan.gmail.searchcache.processSideTreeTimer = window.setTimeout(mromarkhan.gmail.searchcache.addItem,1);
				}
				else
				{
					mromarkhan.gmail.searchcache.processSideTreeTimer = window.setTimeout(mromarkhan.gmail.searchcache.processSideTree,1);
				}
			}
			else
			{
				mromarkhan.gmail.searchcache.processSideTreeTimer = window.setTimeout(mromarkhan.gmail.searchcache.processSideTree,1);
			}
		}
		else
		{
			mromarkhan.gmail.searchcache.stopSearch();
		}
	},
	cacheMetaDataVisitor : {
		visitMetaDataElement : function(aKey, aValue)
		{
			if (!this.data) this.data = {};
			this.data[aKey] = aValue;
		},
		data : null
	},
	str : "",
	addItem : function()
	{

		var HiddenSearchCacheTree = document
					.getElementById("searchcache_sidebar_tree");
		var aNsIRDFService = Components.classes["@mozilla.org/rdf/rdf-service;1"]
			 .getService(Components.interfaces.nsIRDFService);
		var visitPredicate 
			= aNsIRDFService.GetResource("http://home.netscape.com/NC-rdf#VisitCount");
		var namePredicate 
			= aNsIRDFService.GetResource("http://home.netscape.com/NC-rdf#Name");
		var datePredicate 
			= aNsIRDFService.GetResource("http://home.netscape.com/NC-rdf#Date");
		var visitPredicate 
			= aNsIRDFService.GetResource("http://home.netscape.com/NC-rdf#VisitCount");
		var name=' ';
		var nameLiteral = HiddenSearchCacheTree
				.database
				.GetTarget(mromarkhan.gmail.searchcache.resourceIndexed, 
					namePredicate, true);
		var url = " ";
		url = mromarkhan.gmail.searchcache.resourceIndexed.Value;
		if (nameLiteral)
		{
			var nameLiteral = nameLiteral.QueryInterface(Components.interfaces.nsIRDFLiteral);
			name = nameLiteral.Value;
		}	
		var visit = " ";
		var visitCountRes  = HiddenSearchCacheTree.database
				.GetTarget(mromarkhan.gmail.searchcache.resourceIndexed, visitPredicate, true);
		if(visitCountRes)
		{
			var visitCount = visitCountRes.QueryInterface(Components.interfaces.nsIRDFInt);
			visit = visitCount.Value;
		}
		
		var dateInt = 0;
		var dateStr = "";
		var dateRes  = HiddenSearchCacheTree.database
				.GetTarget(mromarkhan.gmail.searchcache.resourceIndexed, datePredicate, true);
		if(dateRes)
		{
			var dateLit = dateRes.QueryInterface(Components.interfaces.nsIRDFDate);
			dateStr = new Date(dateLit.Value/1000);
			 
		}

		var treechildren = document.getElementById('result_treechildren');
		var myXULNS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
		var treeitem = document.createElementNS(myXULNS, "treeitem");
		var treerow = document.createElementNS(myXULNS, "treerow");
		var treecell_name = document.createElementNS(myXULNS, "treecell");
		var treecell_string = document.createElementNS(myXULNS, "treecell");
		var treecell_url = document.createElementNS(myXULNS, "treecell");
		var treecell_date = document.createElementNS(myXULNS, "treecell");
		var treecell_visit = document.createElementNS(myXULNS, "treecell");
		try
		{
		var uri = Components.classes["@mozilla.org/network/standard-url;1"].
		createInstance(Components.interfaces.nsIURI);
		uri.spec = url;
		parent.parent.getBrowser().loadFavIcon(uri,'src',treecell_name);
		}
		catch(err)
		{

		}
		
		treeitem.setAttribute('searchcache',url);
		treecell_name.setAttribute('label',name);
		treecell_string.setAttribute('label',mromarkhan.gmail.searchcache.str.replace(/[\n\r]+/g, ' '));
		
		treecell_url.setAttribute('label',url);
		treecell_visit.setAttribute('label',visit);
		treecell_date.setAttribute('label',dateStr);
		treechildren.appendChild(treeitem);
		treeitem.appendChild(treerow);
		treerow.appendChild(treecell_string);
		treerow.appendChild(treecell_name);
		treerow.appendChild(treecell_url);
		treerow.appendChild(treecell_date);
		treerow.appendChild(treecell_visit);
		mromarkhan.gmail.searchcache.str = "";
		mromarkhan.gmail.searchcache.processSideTreeTimer = window.setTimeout(mromarkhan.gmail.searchcache.processSideTree,1);
	},
	treeCount : 0,
	counter : 0,
	processSideTreeTimer : null,
	stopSearch : function()
	{
		document.getElementById('stop-button-container').collapsed = true;
		document.getElementById('stop-button').disabled            = true;
		if (mromarkhan.gmail.searchcache.processSideTreeTimer)
			window.clearTimeout(mromarkhan.gmail.searchcache.processSideTreeTimer);
		mromarkhan.gmail.searchcache.processSideTreeTimer = null;
	}
};
