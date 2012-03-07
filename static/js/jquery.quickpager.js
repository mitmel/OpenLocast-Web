//-------------------------------------------------
//		Quick Pager jquery plugin
//		Created by dan and emanuel @geckonm.com
//		www.geckonewmedia.com
// 
//		v1.1
//		18/09/09 * bug fix by John V - http://blog.geekyjohn.com/
//-------------------------------------------------

(function($) {
	    
	$.fn.quickPager = function(options) {
	
		var defaults = {
			pageSize: 10,
			currentPage: 1,
			holder: null,
			pagerLocation: "after",
            onPage: function(){}
		};
		
		var options = $.extend(defaults, options);
		
		return this.each(function() {
	
						
			var selector = $(this);	
			var pageCounter = 1;
			
		   //selector.wrap("<div class='simplePagerContainer'></div>");
			
			selector.children().each(function(i){ 
					
				if(i < pageCounter*options.pageSize && i >= (pageCounter-1)*options.pageSize) {
				    $(this).addClass("simplePagerPage"+pageCounter).addClass("paging");
				}
				else {
					$(this).addClass("simplePagerPage"+(pageCounter+1)).addClass("paging");
					pageCounter ++;
				}
				
			});
			
			// show/hide the appropriate regions 
			selector.children().hide();
			selector.children(".simplePagerPage"+options.currentPage).show();
			
            if(pageCounter <= 1){
			  if(options.holder){	
                $(options.holder).html('');
                return;
              }  
            }
			
			//Build pager navigation
			var pageNav = "<ul class='simplePagerNav'>";	
			for (i=1;i<=pageCounter;i++){
				if (i==options.currentPage) {
					pageNav += "<li class='cleared currentPage simplePageNav"+i+"'><a rel='"+i+"' href='#'>"+i+"</a></li>";	
				}
				else {
					pageNav += "<li class='cleared simplePageNav"+i+"'><a rel='"+i+"' href='#'>"+i+"</a></li>";
				}
			}
			pageNav += "</ul>";
			
			if(!options.holder) {
				switch(options.pagerLocation)
				{
				case "before":
					selector.before(pageNav);
				break;
				case "both":
					selector.before(pageNav);
					selector.after(pageNav);
				break;
				default:
					selector.after(pageNav);
				}
			}
			else {
				$(options.holder).html(pageNav);
			}
			
			//pager navigation behaviour
                        var pageNavParent; 
                        if (!options.holder) { 
                            pageNavParent = selector.parent(); 
                        } else { 
                            pageNavParent = $(options.holder); 
                        } 
                        pageNavParent.find(".simplePagerNav a").click(function() {
			
					
				//grab the REL attribute 
				var clickedLink = $(this).attr("rel");
				options.currentPage = clickedLink;
				
				if(options.holder) {
					$(this).parent("li").parent("ul").parent(options.holder).find("li.currentPage").removeClass("currentPage");
					$(this).parent("li").parent("ul").parent(options.holder).find("a[rel='"+clickedLink+"']").parent("li").addClass("currentPage");
				}
				else {
					//remove current current (!) page
					$(this).parent("li").parent("ul").find("li.currentPage").removeClass("currentPage");
					//Add current page highlighting
					$(this).parent("li").parent("ul").find("a[rel='"+clickedLink+"']").parent("li").addClass("currentPage");
				}
				
				//hide and show relevant links
				selector.find(".paging").hide();			
				selector.find(".simplePagerPage"+clickedLink).show();
                
                defaults.onPage.call(this); 
                return false;
			});
		});
	}
	

})(jQuery);

