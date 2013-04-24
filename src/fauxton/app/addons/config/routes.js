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
       "addons/config/resources"
],

function(app, FauxtonAPI, Config) {

  var ConfigRouteObject = FauxtonAPI.RouteObject.extend({
    layout: "one_pane",

    crumbs: [
      {"name": "Config","link": "_config"}
    ],

    apiUrl: function () {
      this.configs.url();
    },

    routes: ["_config"],

    views: function () {
      this.configs = new Config.Collection();

      this.setView("#dashboard-content", new Config.View({collection: this.configs}));
      return {};
    },

    establish: function () {
      return [this.configs.fetch()];
    }
  });


  Config.RouteObjects = [new ConfigRouteObject()];
  return Config;
});
