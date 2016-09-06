(function() {
  'use strict';

  angular.module('app.components')
    .directive('blueprintDialog', BlueprintDialogDirective);

  /** @ngInject */
  function BlueprintDialogDirective($document) {
    var directive = {
      restrict: 'E',
      scope: {
        node: '=',
        nodeAction: '='
      },
      link: link,
      controller: BlueprintDialogController,
      templateUrl: 'app/components/blueprint-dialog/blueprint-dialog.html',
      controllerAs: 'vm',
      bindToController: true,
      transclude: true
    };

    return directive;

    function link(scope, element, attr, controller){

      scope.isPopupVisible = false;
      // scope.toggleSelect = function() {
      //   scope.isPopupVisible = !scope.isPopupVisible;
      // };

      function onClick(event) {
        var isClickedElementChildOfPopup = element
                .find(event.target)
                .length > 0;
        if (isClickedElementChildOfPopup)
          return;
        //controller.hideDialog();
        //scope.$apply();
      }
      // $document.bind('click', onClick);
      //
      // scope.$on("$destroy", function() {
      //   $document.unbind("click", onClick);
      // });
    }

    /** @ngInject */
    function BlueprintDialogController($scope) {
      var vm = this;

      vm.top = 0;
      vm.left = 0;
      vm.textName = "text";

      vm.hideDialog = function() {
        if(vm.node && vm.node.selectedAction) {
          vm.node.selectedAction = undefined;
        }
      };
    }
  }
})();
