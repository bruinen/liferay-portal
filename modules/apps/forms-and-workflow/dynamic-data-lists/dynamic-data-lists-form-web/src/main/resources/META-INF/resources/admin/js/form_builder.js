AUI.add(
	'liferay-ddl-form-builder',
	function(A) {
		var AArray = A.Array;

		var CSS_BTN_LG = A.getClassName('btn', 'lg');

		var CSS_BTN_LINK = A.getClassName('btn', 'link');

		var CSS_BTN_PRIMARY = A.getClassName('btn', 'primary');

		var FieldTypes = Liferay.DDM.Renderer.FieldTypes;

		var FormBuilderUtil = Liferay.DDL.FormBuilderUtil;

		var Lang = A.Lang;

		var CSS_FIELD = A.getClassName('form', 'builder', 'field');

		var CSS_FORM_BUILDER_TABS = A.getClassName('form', 'builder', 'tabs');

		var CSS_PAGE_HEADER = A.getClassName('form', 'builder', 'pages', 'header');

		var CSS_PAGES = A.getClassName('form', 'builder', 'pages', 'lexicon');

		var CSS_ROW_CONTAINER_ROW = A.getClassName('layout', 'row', 'container', 'row');

		var TPL_CONFIRM_CANCEL_FIELD_EDITION = '<p>' + Liferay.Language.get('are-you-sure-you-want-to-cancel') + '</p>';

		var TPL_REQURIED_FIELDS = '<label class="hide required-warning">{message}</label>';

		var FormBuilder = A.Component.create(
			{
				ATTRS: {
					container: {
						getter: function() {
							var instance = this;

							return instance.get('contentBox');
						}
					},

					definition: {
						validator: Lang.isObject
					},

					deserializer: {
						valueFn: '_valueDeserializer'
					},

					evaluatorURL: {
					},

					fieldTypes: {
						setter: '_setFieldTypes',
						valueFn: '_valueFieldTypes'
					},

					getFieldTypeSettingFormContextURL: {
						validator: Lang.isString,
						value: ''
					},

					layouts: {
						valueFn: '_valueLayouts'
					},

					pagesJSON: {
						validator: Array.isArray,
						value: []
					},

					portletNamespace: {
					},

					recordSetId: {
						value: 0
					},

					strings: {
						value: {
							addColumn: Liferay.Language.get('add-column'),
							addField: Liferay.Language.get('add-field'),
							cancelRemoveRow: Liferay.Language.get('cancel'),
							confirmRemoveRow: Liferay.Language.get('yes-delete'),
							formTitle: Liferay.Language.get('build-your-form'),
							modalHeader: Liferay.Language.get('remove-confirmation'),
							pasteHere: Liferay.Language.get('paste-here'),
							removeRowModal: Liferay.Language.get('you-will-also-delete-fields-with-this-row-are-you-sure-you-want-delete-it')
						},
						writeOnce: true
					},

					visitor: {
						getter: '_getVisitor',
						valueFn: '_valueVisitor'
					}
				},

				AUGMENTS: [Liferay.DDL.FormBuilderLayoutBuilderSupport, Liferay.DDM.Renderer.NestedFieldsSupport],

				CSS_PREFIX: 'form-builder',

				EXTENDS: A.FormBuilder,

				NAME: 'liferay-ddl-form-builder',

				prototype: {
					TPL_PAGES: '<div class="' + CSS_PAGES + '" ></div>',

					initializer: function() {
						var instance = this;

						var boundingBox = instance.get('boundingBox');

						instance._createFieldSettingsPanel();

						instance._eventHandlers = [
							boundingBox.delegate('click', instance._onClickPaginationItem, '.pagination li a'),
							boundingBox.delegate('click', A.bind('_afterFieldClick', instance), '.' + CSS_FIELD, instance),
							instance.after('liferay-ddl-form-builder-field-list:fieldsChange', instance._afterFieldListChange, instance),
							instance.after('render', instance._afterFormBuilderRender, instance),
							instance.after(instance._afterRemoveField, instance, 'removeField')
						];
					},

					destructor: function() {
						var instance = this;

						var visitor = instance.get('visitor');

						visitor.set('fieldHandler', instance.destroyField);

						visitor.visit();

						(new A.EventHandle(instance._eventHandlers)).detach();
					},

					cancelFieldEdition: function(field) {
						var instance = this;

						var fieldSettingsPanel = instance.getFieldSettingsPanel();

						var currentFieldSettings = fieldSettingsPanel.getFieldSettings();

						var fieldContext = fieldSettingsPanel._previousContext;

						if (JSON.stringify(fieldContext) != JSON.stringify(currentFieldSettings.context)) {
							instance.confirmCancelFieldChangesDiolog(
								function() {
									instance.confirmCancelFieldChanges(field, fieldContext, fieldSettingsPanel);
								}
							);
						}
						else {
							fieldSettingsPanel.close();
						}
					},

					confirmCancelFieldChanges: function(field, fieldContext, fieldSettingsPanel) {
						var instance = this;

						field.set('context', fieldContext);

						field.render();

						var settingForm = fieldSettingsPanel.settingsForm;

						settingForm.set('context', fieldSettingsPanel._previousFormContext);

						settingForm.render();
					},

					confirmCancelFieldChangesDiolog: function(confirmFn) {
						var instance = this;

						Liferay.Util.openWindow(
							{
								dialog: {
									bodyContent: TPL_CONFIRM_CANCEL_FIELD_EDITION,
									destroyOnHide: true,
									draggable: false,
									height: 210,
									resizable: false,
									toolbars: {
										footer: [
											{
												cssClass: [CSS_BTN_LG, CSS_BTN_PRIMARY].join(' '),
												labelHTML: Liferay.Language.get('yes-cancel'),
												on: {
													click: function(event) {
														confirmFn.apply(instance, arguments);

														Liferay.Util.getWindow('cancelFieldChangesDialog').hide();
													}
												}
											},
											{
												cssClass: [CSS_BTN_LG, CSS_BTN_LINK].join(' '),
												labelHTML: Liferay.Language.get('dismiss'),
												on: {
													click: function() {
														Liferay.Util.getWindow('cancelFieldChangesDialog').hide();
													}
												}
											}
										]
									},
									width: false
								},
								id: 'cancelFieldChangesDialog',
								title: Liferay.Language.get('cancel-field-changes')
							}
						);
					},

					contains: function(field) {
						var instance = this;

						var contains = false;

						var visitor = instance.get('visitor');

						visitor.set('pages', instance.get('layouts'));

						visitor.set(
							'fieldHandler',
							function(currentField) {
								if (currentField === field) {
									contains = true;
								}
							}
						);

						visitor.visit();

						return contains;
					},

					createField: function(fieldType) {
						var instance = this;

						var fieldClass = FormBuilderUtil.getFieldClass(fieldType.get('name'));

						return new fieldClass(
							A.merge(
								fieldType.get('defaultConfig'),
								{
									builder: instance,
									evaluatorURL: instance.get('evaluatorURL'),
									getFieldTypeSettingFormContextURL: instance.get('getFieldTypeSettingFormContextURL'),
									portletNamespace: instance.get('portletNamespace'),
									readOnly: true
								}
							)
						);
					},

					destroyField: function(field) {
						var instance = this;

						field.destroy();
					},

					editField: function(field) {
						var instance = this;

						instance.showFieldSettingsPanel(field);
					},

					findField: function(name) {
						var instance = this;

						var field;

						var visitor = instance.get('visitor');

						visitor.set(
							'fieldHandler',
							function(currentField) {
								if (currentField.get('context.fieldName') === name) {
									field = currentField;
								}
							}
						);

						visitor.visit();

						return field;
					},

					findTypeOfField: function(field) {
						var instance = this;

						return FieldTypes.get(field.get('type'));
					},

					getFieldSettingsPanel: function() {
						var instance = this;

						if (!instance._sidebar) {
							instance._createFieldSettingsPanel();
						}

						return instance._sidebar;
					},

					showFieldSettingsPanel: function(field) {
						var instance = this;

						var settingsPanel = instance.getFieldSettingsPanel();

						settingsPanel.setAttrs(
							{
								field: field
							}
						);

						settingsPanel.open();
					},

					_addFieldsChangeListener: function(layouts) {
						var instance = this;

						layouts.forEach(
							function(layout) {
								instance._fieldsChangeHandles.push(
									layout.after(
										'liferay-ddl-form-builder-field-list:fieldsChange',
										A.bind(instance._afterFieldsChange, instance)
									)
								);
							}
						);
					},

					_afterActivePageNumberChange: function() {
						var instance = this;

						FormBuilder.superclass._afterActivePageNumberChange.apply(instance, arguments);

						instance._syncRequiredFieldsWarning();
						instance._syncRowsLastColumnUI();
					},

					_afterFieldClick: function(event) {
						var instance = this;

						var field = event.currentTarget.getData('field-instance');

						instance.editField(field);
					},

					_afterFieldListChange: function() {
						var instance = this;

						instance._syncRequiredFieldsWarning();
					},

					_afterFormBuilderRender: function() {
						var instance = this;

						instance._fieldToolbar.destroy();
						instance._renderFields();
						instance._renderPages();
						instance._renderRequiredFieldsWarning();
						instance._syncRequiredFieldsWarning();
						instance._syncRowsLastColumnUI();
						instance._syncRowIcons();
					},

					_afterLayoutColsChange: function(event) {
						var instance = this;

						FormBuilder.superclass._afterLayoutColsChange.apply(instance, arguments);

						instance._syncRowLastColumnUI(event.target);
					},

					_afterLayoutRowsChange: function(event) {
						var instance = this;

						FormBuilder.superclass._afterLayoutRowsChange.apply(instance, arguments);

						event.newVal.forEach(instance._syncRowLastColumnUI);
					},

					_afterLayoutsChange: function() {
						var instance = this;

						FormBuilder.superclass._afterLayoutsChange.apply(instance, arguments);

						instance._syncRequiredFieldsWarning();
						instance._syncRowsLastColumnUI();
					},

					_afterRemoveField: function(field) {
						var instance = this;

						instance.removeChild(field);

						instance.getFieldSettingsPanel().close();
					},

					_afterSelectFieldType: function(event) {
						var instance = this;

						var fieldType = event.fieldType;

						var field = instance.createField(fieldType);

						instance.showFieldSettingsPanel(field);

						instance._insertField(field);
					},

					_createFieldSettingsPanel: function() {
						var instance = this;

						var sidebar = new Liferay.DDL.FormBuilderFieldsSettingsSidebar(
							{
								builder: instance
							}
						);

						sidebar.render('#wrapper');

						instance._sidebar = sidebar;

						return sidebar;
					},

					_getPageManagerInstance: function(config) {
						var instance = this;

						var contentBox = instance.get('contentBox');

						if (!instance._pageManager) {
							instance._pageManager = new Liferay.DDL.FormBuilderPagesManager(
								A.merge(
									{
										builder: instance,
										mode: 'wizard',
										pageHeader: contentBox.one('.' + CSS_PAGE_HEADER),
										pagesQuantity: instance.get('layouts').length,
										paginationContainer: contentBox.one('.' + CSS_PAGES),
										tabviewContainer: contentBox.one('.' + CSS_FORM_BUILDER_TABS)
									},
									config
								)
							);
						}

						return instance._pageManager;
					},

					_getVisitor: function(visitor) {
						var instance = this;

						visitor.set('pages', instance.get('layouts'));

						return visitor;
					},

					_insertCutRowIcon: function(row) {
						var instance = this;

						var cutButton = row.ancestor('.' + CSS_ROW_CONTAINER_ROW).one('.layout-builder-move-cut-button');

						if (cutButton) {
							cutButton.insert(Liferay.Util.getLexiconIconTpl('cut'));
						}
					},

					_insertField: function(field) {
						var instance = this;

						var newFieldDefaultContext = {
							portletNamespace: instance.get('portletNamespace'),
							readOnly: true,
							showLabel: true,
							type: field.get('type'),
							visible: true
						};

						field.set('context', newFieldDefaultContext);

						if (this._newFieldContainer) {
							if (A.instanceOf(this._newFieldContainer.get('value'), A.FormBuilderFieldList)) {
								this._newFieldContainer.get('value').addField(field);
								this._newFieldContainer.set('removable', false);
							}
							else {
								this._addNestedField(
									this._newFieldContainer,
									field,
									this._newFieldContainer.get('nestedFields').length
								);
							}
							this._newFieldContainer = null;
						}

						instance._syncRequiredFieldsWarning();

						instance._renderField(field);
					},

					_insertRemoveRowButton: function(layoutRow, row) {
						var instance = this;

						var deleteButton = row.ancestor('.' + CSS_ROW_CONTAINER_ROW).all('.layout-builder-remove-row-button');

						if (deleteButton) {
							deleteButton.empty();
							deleteButton.insert(Liferay.Util.getLexiconIconTpl('trash'));
						}
					},

					_makeEmptyFieldList: function(col) {
						col.set('value', new Liferay.DDL.FormBuilderFieldList());
					},

					_onClickPaginationItem: function(event) {
						var instance = this;

						event.halt();
					},

					_renderContentBox: function() {
						var instance = this;

						var contentBox = instance.get('contentBox');

						var strings = instance.get('strings');

						var headerTemplate = A.Lang.sub(
							instance.TPL_HEADER,
							{
								formTitle: strings.formTitle
							}
						);

						contentBox.append(instance.TPL_TABVIEW);
						contentBox.append(instance.TPL_PAGE_HEADER);
						contentBox.append(headerTemplate);
						contentBox.append(instance.TPL_LAYOUT);
						contentBox.append(instance.TPL_PAGES);
					},

					_renderField: function(field) {
						var instance = this;

						var activeLayout = instance.getActiveLayout();

						field.set('builder', instance);

						field.after(
							'render',
							function() {
								var row = instance.getFieldRow(field);

								activeLayout.normalizeColsHeight(new A.NodeList(row));
							}
						);

						field.render();
					},

					_renderFields: function() {
						var instance = this;

						var visitor = instance.get('visitor');

						visitor.set('fieldHandler', A.bind('_renderField', instance));

						visitor.visit();
					},

					_renderPages: function() {
						var instance = this;

						var deserializer = instance.get('deserializer');

						var pages = instance.get('pages');

						pages.set('descriptions', deserializer.get('descriptions'));
						pages.set('titles', deserializer.get('titles'));

						pages._uiSetActivePageNumber(pages.get('activePageNumber'));
					},

					_renderRequiredFieldsWarning: function() {
						var instance = this;

						var pageManager = instance._getPageManagerInstance();

						if (!instance._requiredFieldsWarningNode) {
							instance._requiredFieldsWarningNode = A.Node.create(
								Lang.sub(
									TPL_REQURIED_FIELDS,
									{
										message: Lang.sub(
											Liferay.Language.get('all-fields-marked-with-x-are-required'),
											['<i class="icon-asterisk text-warning"></i>']
										)
									}
								)
							);
						}

						instance._requiredFieldsWarningNode.appendTo(pageManager.get('pageHeader'));
					},

					_renderRowIcons: function() {
						var instance = this;

						var rows = A.all('.layout-row');

						rows.each(
							function(row) {
								instance._insertCutRowIcon(row);
								instance._insertRemoveRowButton(null, row);
							}
						);
					},

					_setFieldTypes: function(fieldTypes) {
						var instance = this;

						return AArray.filter(
							fieldTypes,
							function(item) {
								return !item.get('system');
							}
						);
					},

					_syncRequiredFieldsWarning: function() {
						var instance = this;

						var boundingBox = instance.get('boundingBox');

						var hasRequiredField = false;

						var visitor = instance.get('visitor');

						visitor.set('pages', instance.get('layouts'));

						visitor.set(
							'fieldHandler',
							function(field) {
								var fieldVisible = boundingBox.contains(field.get('container'));

								if (fieldVisible && field.get('context.required')) {
									hasRequiredField = true;
								}
							}
						);

						visitor.visit();

						instance._requiredFieldsWarningNode.toggle(hasRequiredField);
					},

					_syncRowIcons: function() {
						var instance = this;

						instance._renderRowIcons();

						instance._layoutBuilder.after(instance._insertCutRowIcon, instance._layoutBuilder, '_insertCutButtonOnRow');

						instance._layoutBuilder.after(instance._insertRemoveRowButton, instance._layoutBuilder, '_insertRemoveButtonBeforeRow');
					},

					_syncRowLastColumnUI: function(row) {
						var lastColumn = row.get('node').one('.last-col');

						if (lastColumn) {
							lastColumn.removeClass('last-col');
						}

						var cols = row.get('cols');

						cols[cols.length - 1].get('node').addClass('last-col');
					},

					_syncRowsLastColumnUI: function() {
						var instance = this;

						var rows = instance.getActiveLayout().get('rows');

						rows.forEach(instance._syncRowLastColumnUI);
					},

					_valueDeserializer: function() {
						var instance = this;

						return new Liferay.DDL.LayoutDeserializer(
							{
								builder: instance,
								definition: instance.get('definition')
							}
						);
					},

					_valueFieldTypes: function() {
						var instance = this;

						return FieldTypes.getAll();
					},

					_valueFieldTypesModal: function() {
						var instance = this;

						var strings = A.merge(
							instance.get('strings'),
							{
								addField: Liferay.Language.get('choose-a-field-type')
							}
						);

						var fieldTypesModal = new Liferay.DDL.FormBuilderFieldTypesModal(
							{
								draggable: false,
								fieldTypes: instance.get('fieldTypes'),
								modal: true,
								portletNamespace: instance.get('portletNamespace'),
								resizable: false,
								strings: strings,
								visible: false
							}
						);

						fieldTypesModal.addTarget(this);

						return fieldTypesModal;
					},

					_valueLayouts: function() {
						var instance = this;

						var deserializer = instance.get('deserializer');

						deserializer.set('pages', instance.get('pagesJSON'));

						return deserializer.deserialize();
					},

					_valueVisitor: function() {
						var instance = this;

						return new Liferay.DDL.LayoutVisitor(
							{
								pages: instance.get('layouts')
							}
						);
					}
				}
			}
		);

		Liferay.namespace('DDL').FormBuilder = FormBuilder;
	},
	'',
	{
		requires: ['aui-form-builder', 'aui-form-builder-pages', 'aui-popover', 'liferay-ddl-form-builder-field-settings-sidebar', 'liferay-ddl-form-builder-field-support', 'liferay-ddl-form-builder-field-type', 'liferay-ddl-form-builder-field-types-modal', 'liferay-ddl-form-builder-layout-deserializer', 'liferay-ddl-form-builder-layout-visitor', 'liferay-ddl-form-builder-pages-manager', 'liferay-ddl-form-builder-util', 'liferay-ddm-form-field-types', 'liferay-ddm-form-renderer']
	}
);