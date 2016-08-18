(function() {
  'use strict';

  angular.module('app.components')
    .factory('BlueprintDetailsModal', BlueprintDetailsFactory);

  /** @ngInject */
  function BlueprintDetailsFactory($modal) {
    var modalOpen = false;
    var modalBlueprint = {
      showModal: showModal
    };

    return modalBlueprint;

    function showModal(action, blueprint) {
      var modalOptions = {
        templateUrl: 'app/components/blueprint-details-modal/blueprint-details-modal.html',
        controller: BlueprintDetailsModalController,
        controllerAs: 'vm',
        resolve: {
          action: resolveAction,
          blueprint: resolveBlueprint,
          serviceCatalogs: resolveServiceCatalogs,
          serviceDialogs: resolveServiceDialogs,
          tenants: resolveTenants
        }
      };

      var modal = $modal.open(modalOptions);

      return modal.result;

      function resolveBlueprint() {
        return blueprint;
      }

      function resolveAction() {
        return action;
      }

      function resolveServiceCatalogs(CollectionsApi) {
        var options = {
          expand: 'resources',
          sort_by: 'name',
          sort_options: 'ignore_case'};

        return CollectionsApi.query('service_catalogs', options);
      }

      function resolveServiceDialogs(CollectionsApi) {
        var options = {
          expand: 'resources',
          attributes: ['id', 'description', 'label'],
          sort_by: 'description',
          sort_options: 'ignore_case'};

        return CollectionsApi.query('service_dialogs', options);
      }

      function resolveTenants(CollectionsApi) {
        var options = {
          expand: 'resources',
          attributes: ['id', 'name'],
          sort_by: 'name',
          sort_options: 'ignore_case'
        };

        return CollectionsApi.query('tenants', options);
      }
    }
  }

  /** @ngInject */
  function BlueprintDetailsModalController(action, blueprint, BlueprintsState, MarketplaceState, serviceCatalogs, serviceDialogs, tenants,     // jshint ignore:line
                                           $state, BrowseEntryPointModal, CreateCatalogModal, $modalInstance, CollectionsApi, Notifications,
                                           sprintf, $filter, $scope) {
    var vm = this;
    vm.blueprint = blueprint;

    if (!vm.blueprint.ui_properties.chartDataModel || !vm.blueprint.ui_properties.chartDataModel.nodes) {
      vm.blueprint.ui_properties.chartDataModel = {'nodes': []};
    }

    if (action === 'create') {
      vm.modalTitle = __('Create Blueprint');
      vm.modalBtnPrimaryLabel  = __('Create');
    } else if (action === 'publish') {
      vm.modalTitle = __('Publish ') + vm.blueprint.name;
      vm.modalBtnPrimaryLabel  = __('Publish');
    } else {
      vm.modalTitle = __('Edit Blueprint Details');
      vm.modalBtnPrimaryLabel  = __('Save');
    }

    // vm.serviceCatalogs = serviceCatalogs.resources.concat(BlueprintsState.getNewCatalogs());
    vm.serviceCatalogs = serviceCatalogs.resources;

    vm.serviceDialogs = serviceDialogs.resources;

    vm.visibilityOptions = [{
      id: 800,
      name: 'Private'
    }, {
      id: 900,
      name: 'Public'
    }];
    vm.visibilityOptions = vm.visibilityOptions.concat(tenants.resources);

    vm.saveBlueprintDetails = saveBlueprintDetails;
    vm.cancelBlueprintDetails = cancelBlueprintDetails;
    vm.isCatalogUnassigned = isCatalogUnassigned;
    vm.isCatalogRequired = isCatalogRequired;
    vm.isDialogRequired = isDialogRequired;
    vm.selectEntryPoint = selectEntryPoint;
    vm.createCatalog = createCatalog;
    vm.toggleAdvOps = toggleAdvOps;
    vm.tabClicked = tabClicked;
    vm.isSelectedTab = isSelectedTab;
    vm.disableOrderListTabs = disableOrderListTabs;
    vm.dndServiceItemMoved = dndServiceItemMoved;
    vm.toggleActionEqualsProvOrder = toggleActionEqualsProvOrder;

    vm.modalData = {
      'action': action,
      'resource': {
        'name': vm.blueprint.name || __('Untitled Blueprint ') + BlueprintsState.getNextUniqueId(),
        'visibility': vm.blueprint.visibility,
        'catalog_id': ((vm.blueprint.bundle && vm.blueprint.bundle.service_template_catalog_id)
                        ? vm.blueprint.bundle.service_template_catalog_id : null ),
        'dialog_id': ((vm.blueprint.bundle && vm.blueprint.bundle.service_template_dialog_id)
                        ? vm.blueprint.bundle.service_template_dialog_id : null ),
        'provEP':  vm.blueprint.provEP || "path/to/default/prov/entry/point",
        'reConfigEP': vm.blueprint.reConfigEP,
        'retireEP': vm.blueprint.retireEP
      }
    };

    vm.provOrderChanged = false;
    vm.actionOrderChanged = false;
    vm.actionOrderEqualsProvOrder = true;
    setOrderLists(vm.blueprint.ui_properties.chartDataModel.nodes);

    if (!vm.modalData.resource.visibility) {
      vm.modalData.resource.visibility = vm.visibilityOptions[0];
    } else {
      vm.modalData.resource.visibility = vm.visibilityOptions[
            findWithAttr(vm.visibilityOptions, 'id', vm.modalData.resource.visibility.id)
          ];
    }

    if (vm.modalData.resource.catalog_id) {
      vm.modalData.resource.catalog = vm.serviceCatalogs[ findWithAttr(vm.serviceCatalogs, 'id', vm.modalData.resource.catalog_id) ];
    }

    if (vm.modalData.resource.dialog_id) {
      vm.modalData.resource.dialog = vm.serviceDialogs[ findWithAttr(vm.serviceDialogs, 'id', vm.modalData.resource.dialog_id) ];
    }

    activate();

    function activate() {
    }

    function findWithAttr(array, attr, value) {
      for (var i = 0; i < array.length; i += 1) {
        if (array[i][attr] === value) {
          return i;
        }
      }
    }

    function isCatalogUnassigned() {
      return (vm.modalData.resource.catalog === undefined || vm.modalData.resource.catalog === null);
    }

    function isCatalogRequired() {
      return (action === 'publish') && isCatalogUnassigned();
    }

    function isDialogRequired() {
      return (action === 'publish') && (vm.modalData.resource.dialog === undefined || vm.modalData.resource.dialog === null);
    }

    function createCatalog() {
      var modalInstance = CreateCatalogModal.showModal();

      modalInstance.then(function(opts) {
        console.log("New Catalog Name is '" + opts.catalogName + "'");
        $( "#createCatalog" ).blur();
      });
    }

    function selectEntryPoint(entryPointType) {
      var modalInstance = BrowseEntryPointModal.showModal(entryPointType);

      modalInstance.then(function(opts) {
        if (entryPointType === 'provisioning') {
          vm.modalData.resource.provEP = opts.entryPointData;
        } else if (entryPointType === 'reconfigure') {
          vm.modalData.resource.reConfigEP = opts.entryPointData;
        } else if (entryPointType === 'retirement') {
          vm.modalData.resource.retireEP =  opts.entryPointData;
        }
      });
    }

    function toggleAdvOps() {
      $( "#advOpsHref" ).toggleClass("collapsed");
      $( "#advOps" ).toggleClass("in");
    }

    vm.selectedTabName = "general";

    function tabClicked(tabName) {
      if ( (tabName === 'provision_order' || tabName === 'action_order') && disableOrderListTabs()) {
        return;
      } else {
        vm.selectedTabName = tabName;
      }
    }

    function isSelectedTab(tabName) {
      return vm.selectedTabName === tabName;
    }

    function disableOrderListTabs() {
      return vm.blueprint.ui_properties.chartDataModel.nodes.length <= 1;
    }

    function cancelBlueprintDetails() {
      $modalInstance.close();
    }

    /*
     * This method converts the service items on a blueprint's canvas into a structure
     * required for the DND Provision and Action Order Lists.
     */
    function setOrderLists(blueprintServiceItems) {     // jshint ignore:line
      var items = angular.copy(blueprintServiceItems);
      var lists = [];
      var item;
      var order;
      var i;
      var l;

      // lists[0] = prov. order list, lists[1] = action order list
      lists[0] = {"containers": []};
      lists[1] = {"containers": []};

      // Mark all blueprint service items as type = 'item'
      // Put into appropriate list order 'containers'
      for (i = 0; i < items.length; i++) {
        item = items[i];
        item.type = "item";
        if (!item.provision_order) {
          item.provision_order = 0;
        }
        // Add item to provOrderList and actionOrderList
        for (l = 0; l < 2; l++) {
          if (l === 0) {
            item.parentListName = "provOrder";    // parentListName denotes which list an item was dragged from
            order = item.provision_order;
          } else if (item.action_order !== undefined) {
            item = angular.copy(items[i]);
            item.parentListName = "actionOrder";
            order = item.action_order;
          } else {
            // no action order defined, only build provOrder list
            continue;
          }
          // if container already exists, push in new item
          if (lists[l].containers[order]) {
            lists[l].containers[order].columns[0].push(item);
          } else {
            // create new container
            lists[l].containers[order] =
            {
              "type": "container",
              "columns": [
                [item],
                []
              ]
            };
          }
        }
      }

      // Set dndModels
      vm.dndModels = {'provOrder': {}, 'actionOrder': {}};

      // lists[0] = prov. order list
      vm.dndModels.provOrder = {
        selected: null,
        list: lists[0].containers
      };

      // lists[1] = action order list
      if (lists[1].containers.length) {  // does actionOrder list have any rows?
        // action order has unique order and is editable
        vm.actionOrderEqualsProvOrder = false;
        vm.dndModels.actionOrder = {
          selected: null,
          list: lists[1].containers
        };
      } else {
        // action order == prov. order
        vm.actionOrderEqualsProvOrder = true;
        initActionOrderFromProvOrderList();
      }
    }

    function toggleActionEqualsProvOrder() {
      vm.actionOrderChanged = true;
      // Make actionOrder list a new list, set parentListName to 'actionOrder'
      initActionOrderFromProvOrderList();
    }

    $scope.$on('dnd-item-moved', function(evt, args) {
      dndServiceItemMoved(args.item);
    });

    function dndServiceItemMoved(origItem) {
      if (origItem.parentListName === "provOrder") {
        vm.provOrderChanged = true;
      } else if (origItem.parentListName === "actionOrder") {
        vm.actionOrderChanged = true;
      }

      if (origItem.parentListName === "provOrder" && vm.actionOrderEqualsProvOrder) {
        initActionOrderFromProvOrderList();
      }
    }

    function initActionOrderFromProvOrderList() {
      // Make actionOrder list a new list, set parentListName to 'actionOrder'
      var actionOrderList = angular.copy(vm.dndModels.provOrder.list);
      for (var l = 0; l < actionOrderList.length; l++) {
        for (var cols = 0; cols < actionOrderList[l].columns.length; cols++) {  // will be 2 columns
          for (var col = 0; col < actionOrderList[l].columns[cols].length; col++) {  // Number of items in a column
            var item = actionOrderList[l].columns[cols][col];
            item.parentListName = "actionOrder";
            item.disabled = vm.actionOrderEqualsProvOrder;
          }
        }
      }

      var lastrow = actionOrderList[ actionOrderList.length - 1 ];
      if (lastrow && vm.actionOrderEqualsProvOrder && lastrow.columns[0].length === 0 && lastrow.columns[1].length === 0) {
        // remove last empty row
        actionOrderList.splice(actionOrderList.length - 1, 1);
      }

      vm.dndModels.actionOrder.list = actionOrderList;
    }

    function saveBlueprintDetails() {   // jshint ignore:line
      /* Save any new catalogs
      for (var i = 0; i < vm.serviceCatalogs.length; i += 1) {
        if (vm.serviceCatalogs[i].new) {
          vm.serviceCatalogs[i].new = null;
          BlueprintsState.addNewCatalog(vm.serviceCatalogs[i]);
        }
      } */

      vm.blueprint.name = vm.modalData.resource.name;

      if (!vm.blueprint.visibility || (vm.blueprint.visibility.id.toString() !== vm.modalData.resource.visibility.id.toString())) {
        vm.blueprint.visibility = vm.modalData.resource.visibility;
      }

      if (vm.modalData.resource.catalog) {
        vm.blueprint.bundle.service_template_catalog_id = vm.modalData.resource.catalog.id;
        // Hack until catalog_name is returned with blueprint(s)
        vm.blueprint.ui_properties.catalog_name = vm.modalData.resource.catalog.name;
      } else {
        vm.blueprint.bundle.service_template_catalog_id = null;
        vm.blueprint.ui_properties.catalog_name = null;
      }

      if (vm.modalData.resource.dialog) {
        vm.blueprint.bundle.service_template_dialog_id = vm.modalData.resource.dialog.id;
        // Hack until dialog_id is returned in a bundle
        vm.blueprint.ui_properties.dialog_label = vm.modalData.resource.dialog.label;
      } else {
        vm.blueprint.bundle.service_template_dialog_id = null;
        vm.blueprint.ui_properties.dialog_label = null;
      }

      vm.blueprint.provEP = vm.modalData.resource.provEP;
      vm.blueprint.reConfigEP = vm.modalData.resource.reConfigEP;
      vm.blueprint.retireEP = vm.modalData.resource.retireEP;

      if (vm.provOrderChanged) {
        saveOrder("provisionOrder");
      }

      if (vm.actionOrderChanged) {
        saveOrder("actionOrder");
      }

      if (action === 'publish') {
        $modalInstance.close();
        saveFailure();

        return;
      }

      saveSuccess();

      function saveOrder(orderType) {
        var list;

        if (orderType === 'provisionOrder') {
          list = vm.dndModels.provOrder.list;
        } else if (orderType === 'actionOrder') {
          list = vm.dndModels.actionOrder.list;
        }

        for (var i = 0; i < list.length; i++) {
          var container = list[i];
          if (container.type === 'container') {
            var items = container.columns[0].concat(container.columns[1]);
            for (var j = 0; j < items.length; j++) {
              var item = items[j];
              updateOrder(orderType, item, container.id - 1);
            }
          }
        }
      }

      function updateOrder(orderType, item, orderNum) {
        for (var i = 0; i < vm.blueprint.ui_properties.chartDataModel.nodes.length; i++) {
          var node = vm.blueprint.ui_properties.chartDataModel.nodes[i];
          if (node.id === item.id && node.name === item.name) {
            if (orderType === 'provisionOrder') {
              node.provision_order = orderNum;
            } else if (orderType === 'actionOrder') {
              if (vm.actionOrderEqualsProvOrder) {
                // remove action_order, defer to provision_order
                delete node.action_order;
              } else {
                node.action_order = orderNum;
              }
            }

            return;
          }
        }
      }

      function saveSuccess() {
        if (action === 'create') {
          Notifications.success(sprintf(__('%s was created.'), vm.blueprint.name));
          $modalInstance.close();
          BlueprintsState.saveBlueprint(vm.blueprint);
          $state.go('blueprints.designer', {blueprintId: vm.blueprint.id});
        } else if (action === 'edit') {
          $modalInstance.close({editedblueprint: vm.blueprint});
          Notifications.success(sprintf(__('%s was updated.'), vm.blueprint.name));
        } else if (action === 'publish') {
          $modalInstance.close();
          Notifications.success(sprintf(__('%s was published.'), vm.blueprint.name));
          $state.go($state.current, {}, {reload: true});
        }
      }

      function saveFailure() {
        if (action === 'publish') {
          Notifications.error(__('The Publish Blueprint feature is not yet implemented.'));
        } else {
          Notifications.error(__("There was an error saving this Blueprint's Details."));
        }
      }
    }
  }
})();
