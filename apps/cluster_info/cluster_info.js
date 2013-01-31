// ==========================================================================
// Project:   ClusterInfo
// Copyright: ©2011 My Company, Inc.
// ==========================================================================
/*globals ClusterInfo */

ClusterInfo = SC.Application.create();

// Models
ClusterInfo.Report = SC.Object.extend({
  node: null,
  timestamp: null,
  sections: []
});

// Used for Ajax
ClusterInfo.Report.parseResponse = function(response){
  var text = response.get('body');
  return ClusterInfo.Report.parseText(text);
};

ClusterInfo.Report.parseText = function(text){
  var node = text.match(/Node:\s+'(.*)'/)[1];
  // Convert erlang:now() to epoch timestamp in millis
  var time = parseFloat(text.match(/Current now\s*:\s*\{(\d+),(\d+),(\d+)\}/).slice(1,4).join('')) / 1000;
  var sections = text.split(/^=\s+/m).slice(1).map(ClusterInfo.Section.parse);
  return ClusterInfo.Report.create({
    node: node,
    timestamp: time,
    sections: sections
  });
};

ClusterInfo.Section = SC.Object.extend({
  name: null,
  data: null,
  isExpanded: false
});

ClusterInfo.Section.parse = function(text){
  var lines = text.split('\n').filter(function(line){
    return !(/^\s*$/.test(line));
  });
  return ClusterInfo.Section.create({
    name: lines[0].match(/Generator name: (.*)/)[1].trim(),
    data: lines.slice(1).join("\n")
  });
};

// Controllers
ClusterInfo.reportListController = SC.ArrayController.create({
  content: [],
  allowsMultipleSelection: false,

  addReport: function(text){
    try {
      var report = ClusterInfo.Report.parseText(text);
      this.pushObject(report);
      this.selectObject(report);
    } catch(e) {};
  }
});

// Views
ClusterInfo.pasteReportButtonView = SC.TemplateView.create({
  mouseUp: function(){
    var textarea = this.$('button').parents('#paste-report').find('textarea');
    ClusterInfo.reportListController.addReport(textarea.val());
    textarea.val('');
  }
});

ClusterInfo.uploadReportButtonView = SC.TemplateView.create({
  mouseUp: function(){
    var fileReference = this.$('button').parents('#upload-report').find('input');
    files = document.getElementById('fileInput').files;
    if (files.length == 0) { alert("Select a file to read"); return;}
    file = files[0];
    var reader = new FileReader();
    reader.onload = function(e){

		// e.target.result holds the DataURL which
		// can be used as a source of the image:
		var textarea = $('#paste-report').find('textarea');

		textarea.val(e.target.result);
        ClusterInfo.reportListController.addReport(e.target.result);
	};

	// Reading the file as a DataURL. When finished,
	// this will trigger the onload function above:
	reader.readAsText(file);


  }
});

ClusterInfo.reportView = SC.TemplateView.create({
  contentBinding: "ClusterInfo.reportListController*selection.firstObject",
  nodeBinding: "*content.node",
  contentDidChange: function(){
    var self = this;
    this.invokeOnce(function(){
      jQuery('#report').toggle(!!self.get('content'));
    });
  }.observes('content')
});

ClusterInfo.sectionsView = SC.TemplateCollectionView.create({
  contentBinding: "ClusterInfo.reportView*content.sections",
  itemView: SC.TemplateView.extend(SC.CheckboxSupport, {
    valueBinding: '.content.isExpanded',
    isExpandedDidChange: function(){
      var isExpanded = this.getPath('content.isExpanded');
      this.$('.report-data').toggleClass('expanded', isExpanded);
    }.observes('.content.isExpanded')
  })
});

ClusterInfo.sectionDataView = SC.TemplateView.extend({
  contentBinding: "*parentView.content.data",
  isTextSelectable: true
});


// Hook
jQuery(document).ready(function() {
  ClusterInfo.mainPane = SC.TemplatePane.append({
    layerId: 'cluster_info',
    templateName: 'cluster_info'
  });
  
  // Check for the various File API support.
  if (window.File && window.FileReader && window.FileList && window.Blob) {
  // Great success! All the File APIs are supported.
    $("#upload-report").show();
    $("#paste-report").hide();

  } else {
    $("#upload-report").hide();
  }
  
});
