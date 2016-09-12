function getQueryStringValue (key) {
    return decodeURI(window.location.search.replace(new RegExp("^(?:.*[&\\?]"
        + encodeURI(key).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
}

var app = angular.module('app', ['ngRoute']);

app.config(function($routeProvider) {
    $routeProvider

    // route for the home page
        .when('/', {
            templateUrl : 'templates/message-list.html',
            controller  : 'app.messageListController'
        })

        // route for the about page
        .when('/one-post', {
            templateUrl : 'templates/one-post.html',
            controller  : 'onePostController'
        })

        // route for the contact page
        .when('/search', {
            templateUrl : 'templates/search.html',
            controller  : 'searchController'
        })

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
        toGroupId: -125683505,
        //groupId: -18923086,

        init: function () {
            VK.init({apiId: vk.appID});
            //VK.callMethod('showSettingsBox', 0);
        },

        getMessagesList: function(offset, count) {
            console.log("service");
            var def = $q.defer();

            var query = {
                owner_id: this.groupId,
                filter: "others",
                extended: 1,
                offset: offset,
                count: count
            };
            VK.api('wall.get', query,
                function (r) {
                    var resp = r.response;
                    def.resolve(resp);
                });

            return def.promise;
        },

        getAttachmentsInString: function (attachments) {
            return attachments
                .map(function (attach) {
                    var attachType = attach.type;
                    var attachment = attach[attachType];
                    return attachType + attachment.owner_id + "_" + (!!attachment.pid ? attachment.pid : attachment.vid)
                }).join();
        },

        postMessage: function(message, attachments) {
            var def = $q.defer();
            var requestParams = {
                owner_id: this.toGroupId,
                from_group: 1,
                message: message
            };

            if(!!attachments) {
                requestParams.attachments = this.getAttachmentsInString(attachments);
            }

            VK.api('wall.post', requestParams,
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
        $scope.groups = [];
        $scope.profiles = [];
        $scope.count = 2;

        getNextPage();
        console.log("controller");

        function getNextPage() {
            console.log("getNextPage");
            vkSevanService
                .getMessagesList($scope.messages.length, $scope.count)
                .then(function (resp) {
                    $scope.groups = $scope.groups.concat(resp.groups);
                    $scope.profiles = $scope.profiles.concat(resp.profiles);
                    var wall = resp.wall;
                    wall.shift();
                    $scope.messages = $scope.messages.concat(wall);
                });
        }

        $scope.getNextPage = getNextPage;

        $scope.repostMessage = function (message) {
            vkSevanService
                .postMessage(message.text, message.attachments)
        };

        $scope.getAttachPreview = function (attach) {
            if(!!attach.photo) {
                return attach.photo.src_small;
            } else if(!!attach.video) {
                return attach.video.image_small;
            } else {
                return null;
            }

        };

        $scope.getOwnerName = function(post) {
            return null;
        }
}]);

app.controller('app.onePostController', ['$scope', 'vkSevanService',
    function ($scope, vkSevanService) {
        $scope.messages = [];
}]);

app.controller('app.searchController', ['$scope', 'vkSevanService',
    function ($scope, vkSevanService) {
        $scope.messages = [];
}]);
