function getQueryStringValue (key) {
    return decodeURI(window.location.search.replace(new RegExp("^(?:.*[&\\?]"
        + encodeURI(key).replace(/[.+*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
}

var availableGroups = [
    {id: '-145013503', name: 'Передержка для щенков "МАЛЫШ"'},
    {id: '-124741817', name: 'КОТЕЙКИ ищут ДОМ! Севастопольские КОТОкомбы!'},
    {id: '-98661857', name: 'Общество Лапа помощи - помощь бездомным животным'},
//    {id: '-90113911', name: 'заМУРчательныйЗООмагазин'},
    {id: '-57873454', name: 'Мини-приют СевХвостики помощь бездомным животным'},
    {id: '-144439165', name: 'ПОДАРИ СОБАКЕ ДОМ'},
    {id: '-162207796', name: 'КотоПриют "Шанс", Севастополь'},
    {id: '-18923086', name: 'Благотворительный фонд помощи бездомным животным'}
];

var defaultGroup = availableGroups[0];

var app = angular.module('app', ['ngRoute']);

app.config(function($routeProvider) {
    $routeProvider

    // route for the home page
        .when('/:groupId', {
            templateUrl : 'templates/message-list.html',
            controller  : 'app.messageListController'
        })

        // route for the about page
        .when('/:groupId/one-post', {
            templateUrl : 'templates/one-post.html',
            controller  : 'app.onePostController'
        })

        // route for the contact page
        .when('/:groupId/search', {
            templateUrl : 'templates/search.html',
            controller  : 'app.searchController'
        })

        // route for the contact page
        .when('/:groupId/search-by-date', {
            templateUrl : 'templates/search-by-date.html',
            controller  : 'app.searchByDateController'
        })

        .otherwise({
            redirectTo: '/' + defaultGroup.id,
            templateUrl : 'templates/message-list.html',
            controller  : 'app.messageListController'
        });
});

app.factory('vkSevanServiceFactory', function($q) {
    return function (groupId) {

        var ranges = [
            '\ud83c[\udf00-\udfff]', // U+1F300 to U+1F3FF
            '\ud83d[\udc00-\ude4f]', // U+1F400 to U+1F64F
            '\ud83d[\ude80-\udeff]'  // U+1F680 to U+1F6FF
        ].join('|');

        function stripEmoji(message) {
            return message.replace(new RegExp(ranges, 'g'), '');
        }


        var vk = {
            data: {},
            appID: 5561099,

            fromGroupId: groupId,
            toGroupId: groupId,

            init: function () {
                VK.init({apiId: vk.appID});
                //VK.callMethod('showSettingsBox', 0);
            },

            getMessagesList: function (offset, count) {
                console.log("service");
                var def = $q.defer();

                var query = {
                    owner_id: this.fromGroupId,
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

            getSearchList: function (queryText, offset, count) {
                console.log("service");
                var def = $q.defer();

                var query = {
                    owner_id: this.fromGroupId,
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

            getMessagesById: function (id) {
                console.log("service getMessagesById");
                var def = $q.defer();

                var query = {
                    posts: id,
                    extended: 1
                };
                VK.api('wall.getById', query,
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

            postMessage: function (message, attachments) {
                var def = $q.defer();
                message = stripEmoji(message.replace(/<br>/g, "\n"));
                var requestParams = {
                    owner_id: this.toGroupId,
                    from_group: 1,
                    signed: 1,
                    message: message
                };

                if (!!attachments) {
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
    };
});

app.controller('app.groupSelectController', ['$scope', '$location', function ($scope, $location) {
    $scope.data = {
        availableOptions: availableGroups,
        selectedOption: defaultGroup
    };

    $scope.update = function(newValue) {
        $location.path("/" + newValue.id)
    }
}]);

app.controller('app.baseRepostController', ['$scope', '$sce', '$routeParams', 'vkSevanServiceFactory',
    function ($scope, $sce, $routeParams, vkSevanServiceFactory) {
        $scope.groups = [];
        $scope.profiles = [];

        $scope.repostMessage = function (message) {
            vkSevanServiceFactory(parseInt($routeParams.groupId))
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

        $scope.renderHtml = function(html_code)
        {
            return $sce.trustAsHtml(html_code);
        };

        $scope.formatDate = function(date) {
            return new Date(date * 1000).toString();
        };

        $scope.getOwner = function(fromId) {
            var profile = $scope.profiles.find(function(prof) {
                return prof.uid === fromId;
            });
            if(!!profile) {
                var name = profile.first_name + " " + profile.last_name;
                return {
                    name: name,
                    photo: profile.photo_medium_rec,
                    link: profile.screen_name
                };
            } else {
                var group = $scope.groups.find(function(gr) {
                    return gr.gid === -fromId;
                });
                if(!!group) {
                    return {
                        name: group.name,
                        photo: group.photo,
                        link: group.screen_name
                    };
                } else {
                    return {
                        name: "",
                        photo: "",
                        link: ""
                    };
                }
            }
        };
    }]);

app.controller('app.baseListController', ['$scope', '$controller',
    function ($scope, $controller) {
        $controller('app.baseRepostController', { $scope: $scope });
        $scope.messages = [];
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
                    $scope.messages = $scope.messages.concat(wall);
                    $scope.isListFull = $scope.messages.length >= count;
                });
        }

        $scope.getNextPage = getNextPage;
    }]);
app.controller('app.messageListController', ['$scope', '$controller', '$routeParams', 'vkSevanServiceFactory',
    function ($scope, $controller, $routeParams, vkSevanServiceFactory) {
        $controller('app.baseListController', { $scope: $scope });
        $scope.searchApi = function() {
            return vkSevanServiceFactory(parseInt($routeParams.groupId))
                .getMessagesList($scope.messages.length, $scope.pageSize);

        };

        $scope.getNextPage();
        console.log("app.messageListController controller");

}]);

app.controller('app.onePostController', ['$scope', '$controller', '$routeParams', 'vkSevanServiceFactory',
    function ($scope, $controller, $routeParams, vkSevanServiceFactory) {
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
            vkSevanServiceFactory(parseInt($routeParams.groupId))
                .getMessagesById(id)
                .then(function (resp) {
                    $scope.message = resp.wall.length > 0 ? resp.wall[0] : {};
                    $scope.groups = resp.groups;
                    $scope.profiles = resp.profiles;

                });
        };
    }]);

app.controller('app.searchController', ['$scope', '$controller', '$routeParams', 'vkSevanServiceFactory',
    function ($scope, $controller, $routeParams, vkSevanServiceFactory) {
        $controller('app.baseListController', { $scope: $scope });

        $scope.queryText = "";

        $scope.search = function(keyEvent) {
            if (keyEvent.which === 13) {
                $scope.messages = [];
                $scope.groups = [];
                $scope.profiles = [];
                $scope.isListFull = false;
                $scope.getNextPage();
            }
        };

        $scope.searchApi = function() {
            return vkSevanServiceFactory(parseInt($routeParams.groupId))
                        .getSearchList($scope.queryText, $scope.messages.length, $scope.pageSize)
        };
}]);

app.controller('app.searchByDateController', ['$scope', '$controller', '$routeParams', 'vkSevanServiceFactory',
    function ($scope, $controller, $routeParams, vkSevanServiceFactory) {
        const twoWeeks = new Date();
        twoWeeks.setDate(twoWeeks.getDate() - 14);
        const picker = datepicker("#search-date", {
            startDate: new Date(),
            dateSelected: new Date(),
            minDate: twoWeeks,
            maxDate: new Date(),
            formatter: function(el, date, instance) {
                el.value = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + new Date().getDate();
            },
            onSelect: function(instance) {
                $scope.dateFilter = instance.dateSelected.getTime();
                $scope.getNextPage();
            }
        });

        $controller('app.baseListController', { $scope: $scope });

        $scope.dateFilterText = "";
        $scope.dateFilter = 0;

        $scope.offset = 0;

        $scope.searchApi = function() {
            const startTS = $scope.dateFilter;
            const endTS = startTS + 86400000;

            vkSevanServiceFactory(parseInt($routeParams.groupId))
                .getMessagesList($scope.offset, $scope.pageSize)
                .then(function (r) {
                    $scope.offset = $scope.offset + r.length;
                    $scope.isListFull = r.wall.filter(function (m) { return m.date < startTS}).length > 0;

                    const relevantMessages = r.wall.filter(function (m) { return m.date >= startTS && m.date <= endTS});

                    if(relevantMessages.length === 0 && !$scope.isListFull) {
                        return $scope.searchApi()
                    } else {
                        return relevantMessages;
                    }
                });
        };
}]);
