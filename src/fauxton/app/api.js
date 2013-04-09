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

  // Modules
  "modules/fauxton/base"
],

function(app, Fauxton) {
  var FauxtonAPI = app.module();

  FauxtonAPI.moduleExtensions = {
    Routes: {
    }
  };

  FauxtonAPI.addonExtensions = {
    initialize: function() {}
  };

  // List of JSHINT errors to ignore
  // Gets around problem of anonymous functions not being a valid statement
  FauxtonAPI.excludedViewErrors = [
    "Missing name in function declaration."
  ];

  FauxtonAPI.isIgnorableError = function(msg) {
    return _.contains(FauxtonAPI.excludedViewErrors, msg);
  };

  FauxtonAPI.View = Backbone.View.extend({
    // This should return an array of promises, an empty array, or null
    establish: function() {
      return null;
    }
  });

  FauxtonAPI.navigate = function(url) {
    Backbone.history.navigate(url, true);
  };

  FauxtonAPI.addHeaderLink = function(link) {
    app.masterLayout.navBar.addLink(link);
  };

  FauxtonAPI.Deferred = function() {
    return $.Deferred();
  };

  FauxtonAPI.addRoute = function(route) {
    app.router.route(route.route, route.name, route.callback);
  };

  FauxtonAPI.module = function(extra) {
    return app.module(_.extend(FauxtonAPI.moduleExtensions, extra));
  };

  FauxtonAPI.addon = function(extra) {
    return FauxtonAPI.module(FauxtonAPI.addonExtensions, extra);
  };

  FauxtonAPI.addNotification = function(options) {
    options = _.extend({
      msg: "Notification Event Triggered!",
      type: "info",
      selector: "#global-notifications"
    }, options);
    var view = new Fauxton.Notification(options);

    return view.renderNotification();
  };

  FauxtonAPI.UUID = Backbone.Model.extend({
    initialize: function(options) {
      options = _.extend({count: 1}, options);
      this.count = options.count;
    },

    url: function() {
      return app.host + "/_uuids?count=" + this.count;
    },

    next: function() {
      return this.get("uuids").pop();
    }
  });

  FauxtonAPI.RouteObject = function(options) {
    this._options = options;

    this._configure(options || {});
    this.initialize.apply(this, arguments);
    this.addEvents();
  };

  var routeObjectOptions = ["views", "routes", "events", "data", "crumbs", "layout", "apiUrl", "establish"];

  _.extend(FauxtonAPI.RouteObject.prototype, Backbone.Events, {
    // Should these be default vals or empty funcs?
    views: {},
    routes: {},
    events: {},
    data: {},
    crumbs: [],
    layout: null,
    apiUrl: null,
    establish: null
  }, {
    route: function() {},
    initialize: function() {},
    renderWith: function(layout) {
    },
    get: function(key) {
      return _.isFunction(this[key]) ? this[key]() : this[key];
    },
    addEvents: function(events) {
      events = events || this.get('events');
      _.each(events, function(method, event) {
        if (!_.isFunction(method) && !_.isFunction(this[method])) {
          throw new Error("Invalid method: "+method);
        }
        method = _.isFunction(method) ? method : this[method];

        this.on(event, method);
      }, this);
    },
    _configure: function(options) {
      /*
      _.each(_.intersection(_.keys(options), routeObjectOptions), function(key) {
        this[key] = options[key];
      }, this);
      */
      _.each(options, function(val, key) { this[key] = val; }, this);
    },
    setView: function(selector, view) {
      this.views[selector] = view;
      return view;
    },
    getViews: function() {
      return this.views;
    }
  });

  app.fauxtonAPI = FauxtonAPI;
  return app.fauxtonAPI;
});
