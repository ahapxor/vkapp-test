function getQueryStringValue (key) {
    return decodeURI(window.location.search.replace(new RegExp("^(?:.*[&\\?]"
        + encodeURI(key).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
}

var app = angular.module('app', ['ngRoute']);

app.config(function($routeProvider) {
    $routeProvider

    // route for the home page
    //    .when('/', {
    //        templateUrl : 'templates/message-list.html',
    //        controller  : 'app.messageListController'
    //    })

        // route for the about page
        //.when('/configs', {
        //    templateUrl : 'resources/pages/configs.html',
        //    controller  : 'configsController'
        //})

        // route for the contact page
        //.when('/java-deploy', {
        //    templateUrl : 'resources/pages/java-deploy.html',
        //    controller  : 'javaDeployController'
        //})

        .otherwise({
            redirectTo: '/',
            templateUrl : 'templates/message-list.html',
            controller  : 'app.messageListController'
        });
});

app.factory('vkSevanService', function($q) {
    var vk = {
        data: {},
        appID: 5561099,
        groupId: -125683505,
        //groupId: -18923086,

        init: function () {
            VK.init({apiId: vk.appID});
            VK.callMethod('showSettingsBox', 0);
        },

        getMessagesList: function(offset, count) {
            var def = $q.defer();

            VK.api('wall.get', {
                    owner_id: this.groupId,
                    filter: "others",
                    offset: offset,
                    count: count
                },
                function (r) {
                    var resp = r.response;
                    resp.shift();
                    def.resolve(resp);
                });

            return def.promise;
        },

        postMessage: function(message, attachments) {
            var def = $q.defer();
            var attachList = !attachments ?
                "photo" :
                attachments
                    .map(function(attach) {
                        var attachType = attach.type;
                        var attachment = attach[attachType];
                        return attachType + attachment.owner_id + "_" + (!!attachment.pid ? attachment.pid : attachment.vid)
                    }).join();

            VK.api('wall.post', {
                    owner_id: this.groupId,
                    from_group: 1,
                    message: message,
                    attachments: attachList
                },
                function (r) {
                    var resp = r.response;
                    def.resolve(resp);
                });

            return def.promise;
        }
    };
    vk.init();
    return vk;
});

app.controller('app.messageListController', ['$scope', 'vkSevanService',
    function ($scope, vkSevanService) {
        $scope.messages = [];

        vkSevanService
            .getMessagesList(0, 25)
            .then(function(resp) {
                $scope.messages = resp;
            });

        $scope.repostMessage = function (message) {
            vkSevanService
                .postMessage(message.text, message.attachments)
        }
}]);
