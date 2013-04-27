// Licensed under the Apache License, Version 2.0 (the "License"); you may not
// use this file except in compliance with the License. You may obtain a copy of
// the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations under
// the License.

define([
       "app",

       "api",

       // Modules
       "modules/documents/resources",
       "modules/databases/base"
],

function(app, FauxtonAPI, Documents, Databases) {
  // TODO: look at using:
  // var Documents = require("modules/documents/models_collections");
  // var Databases = require("modules/databases/module");

  // TODO:: expand this for new docs and design docs
  var DocEditorRouteObject = FauxtonAPI.RouteObject.extend({
    layout: "one_pane",

    initialize: function() {
      this.selected = false;
    },

    routes: function() {
      return _.keys(this.selectedRoutes);
    },

    selectedRoutes: {
      "database/:database/:doc/field_editor": "field_editor",
      "database/:database/:doc/code_editor": "code_editor",
      "database/:database/:doc": "code_editor"
    },

    crumbs: function() {
      return [
        {"name": "Databases", "link": "/_all_dbs"},
        {"name": this.database.id, "link": Databases.databaseUrl(this.database)},
        {"name": this.docID, "link": "#"}
      ];
    },

    setEditorView: function() {
      if (this.selected === "field_editor") {
        this.docView = this.setView("#dashboard-content", new Documents.Views.DocFieldEditor({
          model: this.doc
        }));
      } else {
        this.docView = this.setView("#dashboard-content", new Documents.Views.Doc({
          model: this.doc
        }));
      }
    },

    route: function(route, args) {
      var databaseName = args[0], docID = args[1];

      this.database = this.database || new Databases.Model({id: databaseName});
      this.doc = this.doc || new Documents.Doc({
        _id: docID
      }, {
        database: this.database
      });

      if (this.selected !== this.selectedRoutes[route]) {
        this.selected = this.selectedRoutes[route];
        this.setEditorView();
      }

      this.tabsView = this.setView("#tabs", new Documents.Views.FieldEditorTabs({
        selected: this.selected,
        model: this.doc
      }));
    },

    apiUrl: function() {
      return this.doc.url();
    }
  });

  var newViewEditorCallback = function(databaseName) {
    var data = {
      database: new Databases.Model({id:databaseName})
    };
    data.designDocs = new Documents.AllDocs(null, {
      database: data.database,
      params: {startkey: '"_design"',
        endkey: '"_design1"',
        include_docs: true}
    });

    return {
      layout: "with_tabs_sidebar",

      data: data,

      crumbs: [
        {"name": "Databases", "link": "/_all_dbs"},
        {"name": data.database.id, "link": data.database.url('app')}
      ],

      views: {
        "#sidebar-content": new Documents.Views.Sidebar({
          collection: data.designDocs
        }),

        "#tabs": new Documents.Views.Tabs({
          collection: data.designDocs,
          database: data.database
        }),

        "#dashboard-content": new Documents.Views.ViewEditor({
          model: data.database,
          ddocs: data.designDocs
        })
      },

      apiUrl: data.database.url()
    };
  };

  // HACK: this kind of works
  // Basically need a way to share state between different routes, for
  // instance making a new doc won't work for switching back and forth
  // between code and field editors
  var newDocCodeEditorCallback = function(databaseName) {
    var data = {
      database: new Databases.Model({id:databaseName}),
      doc: new Documents.NewDoc(),
      selected: "code_editor"
    };
    data.doc.database = data.database;
    data.designDocs = new Documents.AllDocs(null, {
      database: data.database,
      params: {startkey: '"_design"',
        endkey: '"_design1"',
        include_docs: true}
    });

    var options = app.getParams();
    options.include_docs = true;
    data.database.buildAllDocs(options);

    return {
      layout: "one_pane",

      data: data,

      crumbs: [
        {"name": "Databases", "link": "/_all_dbs"},
        {"name": data.database.id, "link": Databases.databaseUrl(data.database)},
        {"name": "new", "link": "#"}
      ],

      views: {
        "#dashboard-content": new Documents.Views.Doc({
          model: data.doc
        }),

        "#tabs": new Documents.Views.FieldEditorTabs({
          selected: data.selected,
          model: data.doc
        })
      },

      apiUrl: data.doc.url()
    };
  };


  var DocumentsRouteObject = FauxtonAPI.RouteObject.extend({
    layout: "with_tabs_sidebar",

    events: {
      "route:all_docs": "allDocs",
      "route:all_design_docs": "allDesignDocs"
    },

    crumbs: function () {
      return [
        {"name": "Databases", "link": "/_all_dbs"},
        {"name": this.data.database.id, "link": Databases.databaseUrl(this.data.database)}
      ];
    },

    allDocs: function() {
      console.log("TRIGGERING all_docs ROUTE EVENT", arguments);
    },

    allDesignDocs: function() {
      console.log("TRIGGERING all_design_docs ROUTE EVENT", arguments);
    },

    routes: ["database/:database/_all_docs(:extra)", "database/:database/_design/:ddoc/_view/:view"],

    apiUrl: function() {
      return this.data.database.allDocs.url();
    },

    route: function(route, params) {
      this.databaseName = params[0];

      if (params.length > 2) {
        this.view = params[2].replace(/\?.*$/,'');
        this.ddoc = params[1];
      } else {
        delete this.view;
        delete this.ddoc;
      }
    },

    // this works for now, but it might be work considering having a renderWith function 
    // that only renders a specific view and setups up that views establish beforehand.
    rerender: function () {
      var self = this,
          options = app.getParams();

      options.include_docs = true;
      this.data.database.buildAllDocs(options);

      this.updateDashboardView();

      //this.documentsView.collection = this.data.database.allDocs;

      $.when.apply(null, this.documentsView.establish()).then(function () {
        //self.documentsView.render();
        self.rerenderView('#dashboard-content');
      });
    },

    updateDashboardView: function () {
      var options = app.getParams();

      if (this.view) {
        var ddocInfo = {
        id: "_design/" + this.ddoc,
          currView: this.view,
          designDocs: this.data.designDocs
        };

        this.data.indexedDocs = new Documents.IndexCollection(null, {
          database: this.data.database,
          design: this.ddoc,
          view: this.view,
          params: options
        });

        this.documentsView = this.setView('#dashboard-content',new Documents.Views.AllDocsList({
            collection: this.data.indexedDocs,
            nestedView: Documents.Views.Row,
            viewList: true,
            ddocInfo: ddocInfo,
            params: options
          }));

      } else {

        this.documentsView = this.setView("#dashboard-content", new Documents.Views.AllDocsList({
          collection: this.data.database.allDocs
        }));
      }
      
    },

    views: function () {
      this.data = {
        database: new Databases.Model({id:this.databaseName})
      };

      this.data.designDocs = new Documents.AllDocs(null, {
        database: this.data.database,
        params: {startkey: '"_design"',
          endkey: '"_design1"',
          include_docs: true}
      });


      var options = app.getParams();
      options.include_docs = true;
      this.data.database.buildAllDocs(options);

      if (this.view) {
        var ddocInfo = {
        id: "_design/" + this.ddoc,
          currView: this.view,
          designDocs: this.data.designDocs
        };

        this.data.indexedDocs = new Documents.IndexCollection(null, {
          database: this.data.database,
          design: this.ddoc,
          view: this.view,
          params: options
        });

        this.documentsView = this.setView('#dashboard-content',new Documents.Views.AllDocsList({
            collection: this.data.indexedDocs,
            nestedView: Documents.Views.Row,
            viewList: true,
            ddocInfo: ddocInfo,
            params: options
          }));

      } else {

        this.documentsView = this.setView("#dashboard-content", new Documents.Views.AllDocsList({
          collection: this.data.database.allDocs
        }));
      }

      
      this.setView("#sidebar-content", new Documents.Views.Sidebar({
        collection: this.data.designDocs
      }));

      this.setView("#tabs", new Documents.Views.Tabs({
        collection: this.data.designDocs,
        database: this.data.database
      }));
    }
  });



  var ChangesRouteObject = FauxtonAPI.RouteObject.extend({
    layout: "with_tabs",

    crumbs: function () {
      return [
        {"name": "Databases", "link": "/_all_dbs"},
        {"name": this.database.id, "link": Databases.databaseUrl(this.database)},
        {"name": "_changes", "link": "/_changes"}
      ];
    },

    routes: ["database/:database/_changes(:params)"],

    apiUrl: function() {
      return this.database.changes.url();
    },

    route: function(route, params) {
      this.databaseName = params[0];
    },

    views: function () {
      this.database = new Databases.Model({id: this.databaseName});

      var options = app.getParams();
      this.database.buildChanges(options);


      this.setView("#dashboard-content", new Documents.Views.Changes({
        model: this.database
      }));

      this.setView("#tabs", new Documents.Views.Tabs({
        collection: this.designDocs,
        database: this.database,
        active_id: 'changes'
      }));
    }

  });





  /* Documents.Routes = {
  //"database/:database/:doc/code_editor": codeEditorCallback,
  //"database/:database/:doc": codeEditorCallback,
  "database/:database/_design%2F:doc": function(database, doc) {
  var docID = "_design/"+doc;
  return codeEditorCallback(database, docID);
  },

  "database/:database/_all_docs(:extra)": function(databaseName, page) {
  var data = {
database: new Databases.Model({id:databaseName})
};
data.designDocs = new Documents.AllDocs(null, {
database: data.database,
params: {startkey: '"_design"',
endkey: '"_design1"',
include_docs: true}
});

var options = app.getParams();
options.include_docs = true;
data.database.buildAllDocs(options);

return {
layout: "with_tabs_sidebar",

data: data,

crumbs: [
{"name": "Databases", "link": "/_all_dbs"},
{"name": data.database.id, "link": Databases.databaseUrl(data.database)}
],

views: {
"#dashboard-content": new Documents.Views.AllDocsList({
collection: data.database.allDocs
}),

"#sidebar-content": new Documents.Views.Sidebar({
collection: data.designDocs
}),

"#tabs": new Documents.Views.Tabs({
collection: data.designDocs,
database: data.database
})
},

apiUrl: data.database.allDocs.url()
};
},

"database/:database/_changes(:params)": function(databaseName, params) {
var data = {
database: new Databases.Model({id:databaseName})
};

var options = app.getParams();
data.database.buildChanges(options);

return {
layout: "with_tabs",

data: data,

crumbs: [
{"name": "Databases", "link": "/_all_dbs"},
{"name": data.database.id, "link": Databases.databaseUrl(data.database)},
{"name": "_changes", "link": "/_changes"}
],

views: {
         "#dashboard-content": new Documents.Views.Changes({
model: data.database
}),

         "#tabs": new Documents.Views.Tabs({
collection: data.designDocs,
database: data.database,
active_id: 'changes'
})
},

apiUrl: data.database.changes.url()
  };
},

  "database/:database/new": newDocCodeEditorCallback,
  "database/:database/new_view": newViewEditorCallback,

  // TODO: fix optional search params
  // Can't get ":view(?*search)" to work
  // However ":view?*search" does work
  //"database/:database/_design/:ddoc/_view/:view(\?*options)": function(databaseName, ddoc, view, options) {
  "database/:database/_design/:ddoc/_view/:view": function(databaseName, ddoc, view, options) {
    // hack around backbone router limitations
    view = view.replace(/\?.*$/,'');
    var params = app.getParams();
    var data = {
database: new Databases.Model({id:databaseName})
    };

    data.indexedDocs = new Documents.IndexCollection(null, {
database: data.database,
design: ddoc,
view: view,
params: params
});

data.designDocs = new Documents.AllDocs(null, {
database: data.database,
params: {startkey: '"_design"',
endkey: '"_design1"',
include_docs: true}
});

var ddocInfo = {
id: "_design/" + ddoc,
    currView: view,
    designDocs: data.designDocs
};

return {
layout: "with_tabs_sidebar",

          data: data,
          // TODO: change dashboard-content
          views: {
            "#dashboard-content": new Documents.Views.AllDocsList({
collection: data.indexedDocs,
nestedView: Documents.Views.Row,
viewList: true,
ddocInfo: ddocInfo,
params: params
}),

            "#sidebar-content": new Documents.Views.Sidebar({
collection: data.designDocs,
ddocInfo: ddocInfo
}),

            "#tabs": new Documents.Views.Tabs({
collection: data.designDocs,
database: data.database
})
},

crumbs: [
{"name": "Databases", "link": "/_all_dbs"},
{"name": data.database.id, "link": Databases.databaseUrl(data.database)},
{"name": ddoc + "/" + view, "link": data.indexedDocs.url()}
],
  // TODO: change to view URL
  apiUrl: data.indexedDocs.url()
  };
}
};*/

  Documents.RouteObjects = [new DocEditorRouteObject(), new DocumentsRouteObject(), new ChangesRouteObject()];

  return Documents;
});
