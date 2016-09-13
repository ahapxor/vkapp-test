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
            controller  : 'app.onePostController'
        })

        // route for the contact page
        .when('/search', {
            templateUrl : 'templates/search.html',
            controller  : 'app.searchController'
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
        //toGroupId: -18923086,

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

        getSearchList: function(queryText, offset, count) {
            console.log("service");
            var def = $q.defer();

            var query = {
                owner_id: this.groupId,
                query: queryText,
                extended: 1,
                offset: offset,
                count: count
            };
            VK.api('wall.search', query,
                function (r) {
                    var resp = r.response;
                    def.resolve(resp);
                });

            return def.promise;
        },

        getMessagesById: function(id) {
            console.log("service getMessagesById");
            var def = $q.defer();

            var query = {
                posts: id
            };
            VK.api('wall.getById', query,
                function (r) {
                    var resp = r.response[0];
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
            message = message.replace(/<br>/g, "\n");
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

app.controller('app.baseRepostController', ['$scope', 'vkSevanService',
    function ($scope, vkSevanService) {
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
}]);

app.controller('app.baseListController', ['$scope', '$controller', 'vkSevanService',
    function ($scope, $controller, vkSevanService) {
        $controller('app.baseRepostController', { $scope: $scope });
        $scope.messages = [];
        $scope.groups = [];
        $scope.profiles = [];
        $scope.pageSize = 30;
        $scope.isListFull = false;



        function getNextPage() {
            console.log("getNextPage");
            if($scope.isListFull) {
                return;
            }
            $scope.searchApi()
                .then(function (resp) {
                    $scope.groups = $scope.groups.concat(resp.groups);
                    $scope.profiles = $scope.profiles.concat(resp.profiles);
                    var wall = resp.wall;
                    var count = wall.shift();
                    $scope.messages = $scope.messages.concat(wall.map(function (str) {
                        str.replace(/<br>/g, "\n")
                    }));
                    $scope.isListFull = $scope.messages.length >= count;
                });
        }

        $scope.getNextPage = getNextPage;

        $scope.getOwnerName = function(post) {
            return null;
        }
}]);
app.controller('app.messageListController', ['$scope', '$controller', 'vkSevanService',
    function ($scope, $controller, vkSevanService) {
        $controller('app.baseListController', { $scope: $scope });
        $scope.searchApi = function() {
            return vkSevanService
                .getMessagesList($scope.messages.length, $scope.pageSize);

        };

        $scope.getNextPage();
        console.log("app.messageListController controller");

}]);

app.controller('app.onePostController', ['$scope', '$controller', 'vkSevanService',
    function ($scope, $controller, vkSevanService) {
        $controller('app.baseRepostController', { $scope: $scope });

        $scope.postLink = "";
        $scope.parsedId = "";
        $scope.message = {};
        var parseRegex = /wall(-[0-9]+_[0-9]+)/;

        function parseId(link) {
            var matches = parseRegex.exec(link);
            return !!matches && matches.length > 1 ? matches[1] : "";
        }

        $scope.reloadMessage = function() {
            var id = parseId($scope.postLink);
            if(id.length == 0) {
                return;
            }
            vkSevanService
                .getMessagesById(id)
                .then(function (resp) {
                    $scope.message = resp;
                });
        };
    }]);

app.controller('app.searchController', ['$scope', '$controller', 'vkSevanService',
    function ($scope, $controller, vkSevanService) {
        $controller('app.baseListController', { $scope: $scope });

        $scope.queryText = "";

        $scope.search = function(keyEvent) {
            if (keyEvent.which === 13) {
                $scope.messages = [];
                $scope.groups = [];
                $scope.profiles = [];
                $scope.isListFull = false;
                getNextPage();
            }
        };

        $scope.searchApi = function() {
            return vkSevanService
                        .getSearchList($scope.queryText, $scope.messages.length, $scope.pageSize)
        };
}]);
