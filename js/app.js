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
        //appPermissions: 16,

        init: function () {
            VK.init({apiId: vk.appID});
        },

        getMessagesList: function(offset, count) {
            var def = $q.defer();

            VK.api('wall.get', {
                    domain: 'sevanimals',
                    offset: offset,
                    count: count
                },
                function (r) {
                    var resp = r.response;
                    resp.shift();
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
            .getMessagesList(1, 25)
            .then(function(resp) {
                $scope.messages = resp;
            });
}]);
