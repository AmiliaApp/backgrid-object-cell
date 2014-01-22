/*
  Backgrid ObjectCell extension
  http://github.com/amiliaapp/backgrid-object-cell

  Creates a Backgrid Cell for editing an object or array into a Bootstrap modal dialog.
  Adds these new cells (under Backgrid.Extension):
    - ObjectCell: To render and edit an object. Will display a modal dialog with a form.
	- ArrayObjectCell: To render and edit an array of objects. Will display a modal 
	                   dialog with a Backgrid.
  Adds these new editors as well:
    - ObjectCellEditor
	- ArrayObjectCelleditor
  
  Depends on Bootstrap 3. For Bootstrap 2.3, slight mods are required. See note at bottom.

  Copyright (c) 2014 Amilia Inc.
  Written by Martin Drapeau
  Licensed under the MIT @license
 */
(function(){
	
	/**
	   ObjectCell can render and edit an object stored inside a model attribute.
	   Provide a formatter to serialize as a string to show in the cell.
	   When editing, will open a Bootstrap modal dialog with a form to edit fields
	   that you specify in schema. After editing, will set the modified attribute
	   on the model.
	   Options:
	     - formatter: Provide a fromRaw function to humanize.
	     - schema: An array of field objects in the form {name:'field attribute', label:'field label', ...}
	               Valid field attributes are:
	                 - name: Name of object attribute to edit.
	                 - label: Label to display in form.
	                 - placeholder: Optional. Placeholder to put on input.
	*/

	var ObjectCellEditor = Backgrid.Extension.ObjectCellEditor = Backgrid.CellEditor.extend({
		modalTemplate: _.template([
			'<div class="modal">',
			'  <div class="modal-dialog">',
			'    <div class="modal-content">',
			'      <div class="modal-header">',
			'        <a type="button" class="close" aria-hidden="true">&times;</a>',
			'        <h4><%=title%></h4>',
			'      </div>',
			'      <div class="modal-body"></div>',
			'      <div class="modal-footer">',
			'        <a href="#" class="save btn btn-primary">Save</a>',
			'        <a href="#" class="close btn btn-default">Cancel</a>',
			'      </div>',
			'    </div>',
			'  </div>',
			'</div>'
		].join("\n")),
		stringTemplate: _.template([
			'<div class="form-group">',
			'  <label class="control-label col-sm-4"><%=label%></label>',
			'  <div class="col-sm-8">',
			'    <input type="text" class="form-control" name="<%=name%>" value="<%=value%>" placeholder="<%=placeholder%>" />',
			'  </div>',
			'</div>'
		].join("\n")),
		
		extendWithOptions: function(options) {
			_.extend(this, options);
		},

		render: function () {
			var view = this,
				model = this.model,
				column = this.column,
				schema = this.schema;
			if (!_.isArray(schema)) throw new TypeError("schema must be an array");

			// Extract the object, and create a Backbone model from it.
			var object = model.get(column.get("name")),
				objectModel = this.objectModel = new Backbone.Model(_.clone(object));

			// In the cell just show the humanized value
			this.$el.text(this.formatter.fromRaw(object, model));

			// Create our Bootstrap modal dialog
			var $dialog = this.$dialog = $(this.modalTemplate({title: column.get("label")}));

			// Add the Bootstrap form
			var $form = $('<form class="form-horizontal">');
			$dialog.find('div.modal-body').append($form);
			_.each(this.schema, function(field) {
				if (!_.isObject(field) || !field.name || !field.label)
					throw new TypeError("schama elements must be field objects in the form {name:'field attribute', label:'field label'}");
				var template = view.stringTemplate,
					data = _.extend({placeholder: ""}, field, {value: objectModel.get(field.name)});
				$form.append(template(data));
			});

			return this;
		},
		postRender: function(model, column) {
			var view = this,
				$dialog = this.$dialog;

			// Show the Bootstrap modal dialog
			$dialog.modal({keyboard: false});

			// Handle close and save events
			$dialog.find('a.close').click(function(e) {
				e.preventDefault();
				$dialog.modal("hide");
				view.cancel();
				return false;
			});
			$dialog.find('a.save').click(function(e) {
				e.preventDefault();
				$dialog.modal("hide");
				try {
					view.save();
				} catch (error) {
					alert("Crap!");
				}
				return false;
			});

			return this;
		},
		save: function() {
			var model = this.model,
				column = this.column,
				objectModel = this.objectModel,
				$form = this.$dialog.find('form');

			// Retrieve values from the form, and store inside the object model
			var changes = {};
			_.each(this.schema, function(field) {
				changes[field.name] = $form.find('input[name='+field.name+']').val();
			});
			objectModel.set(changes);

			// Now change our model
			model.set(column.get("name"), objectModel.toJSON());

			model.trigger("backgrid:edited", model, column, new Backgrid.Command({keyCode:13}));
			return this;
		},
		cancel: function() {
			this.model.trigger("backgrid:edited", this.model, this.column, new Backgrid.Command({keyCode:27}));
			return this;
		},
		remove: function() {
			Backgrid.CellEditor.prototype.remove.apply(this, arguments);
			this.$dialog.remove();
			return this;
		}
	});

	var ObjectCell = Backgrid.Extension.ObjectCell = Backgrid.Cell.extend({
		editorOptionDefaults: {
			schema: []
		},
		formatter: {
			// Defaults to JSON stringification
			fromRaw: function(object) {
				return JSON.stringify(object);
			}
		},
		editor: ObjectCellEditor,
		initialize: function(options) {
			Backgrid.Cell.prototype.initialize.apply(this, arguments);

			// Pass on cell options to the editor
			var cell = this,
				editorOptions = {};
			_.each(this.editorOptionDefaults, function(def, opt) {
				if (!cell[opt]) cell[opt] = def;
				if (options && options[opt]) cell[opt] = options[opt];
				editorOptions[opt] = cell[opt];
			});
			this.listenTo(this.model, "backgrid:edit", function (model, column, cell, editor) {
				if (column.get("name") == this.column.get("name"))
					editor.extendWithOptions(editorOptions);
			});
		}
	});


	/**
	   ArrayObjectCell can render and edit an array of objects stored inside a
	   model attribute. Provide a formatter to serialize as a string to show in the cell.
	   When editing, will open a Bootstrap modal dialog with a Backgrid table to edit
	   each object. Specify which object attributes to edit via option objectColumns.
	   After editing, will set the modified attribute on the model.
	   The 
	   Options:
	     - formatter: Provide a fromRaw function to humanize.
		 - backgrid: Backgrid grid class to instantiate. Defaults to Backgrid.Grid.
	     - gridOptions: Backgrid options. Should include columns.
	*/

	var ArrayObjectCellEditor = Backgrid.Extension.ArrayObjectCellEditor = Backgrid.Extension.ObjectCellEditor.extend({
		render: function () {
			var view = this,
				model = this.model,
				column = this.column,
				gridOptions = this.gridOptions;

			// Extract the object, and create a Backbone model from it.
			var array = _.map(model.get(column.get("name")), function(object) {return _.clone(object);}),
				objectCollection = this.objectCollection = new Backbone.Collection(array);

			// In the cell just show the humanized value
			this.$el.text(this.formatter.fromRaw(array, model));

			// Create our Bootstrap modal dialog
			var $dialog = this.$dialog = $(this.modalTemplate({title: column.get("label")}));

			// Add the Backgrid Grid
			var grid = new this.backgrid(_.extend({collection: objectCollection}, gridOptions)),
				$grid = grid.render().$el;
			$dialog.find('div.modal-body').append($grid);

			return this;
		},
		save: function() {
			var model = this.model,
				column = this.column,
				objectCollection = this.objectCollection;

			model.set(column.get("name"), objectCollection.toJSON());

			model.trigger("backgrid:edited", model, column, new Backgrid.Command({keyCode:13}));
			return this;
		}
	});

	var ArrayObjectCell = Backgrid.Extension.ArrayObjectCell = Backgrid.Extension.ObjectCell.extend({
		editorOptionDefaults: {
			backgrid: Backgrid.Grid,
			gridOptions: {}
		},
		formatter: {
			// Defaults to JSON stringification
			fromRaw: function(array) {
				return JSON.stringify(array);
			}
		},
		editor: ArrayObjectCellEditor
	});
	
	/**
		Bootstrap 2.3 use requires are change in modal and form templates.
		
		Backgrid.Extension.ObjectCellEditor.prototype.modalTemplate = _.template([
			'<div class="modal hide">',
			'  <div class="modal-header">',
			'    <a type="button" class="close" aria-hidden="true">&times;</a>',
			'    <h3><%=title%></h3>',
			'  </div>',
			'  <div class="modal-body"></div>',
			'  <div class="modal-footer">',
			'    <a href="#" class="save btn btn-primary">Save</a>',
			'    <a href="#" class="close btn ">Cancel</a>',
			'  </div>',
			'</div>'
		].join("\n"));
		Backgrid.Extension.ObjectCellEditor.prototype.stringTemplate = _.template([
			'<div class="control-group">',
			'  <label class="control-label"><%=label%></label>',
			'  <div class="controls">',
			'    <input type="text" name="<%=name%>" value="<%=value%>" placeholder="<%=placeholder%>" />',
			'  </div>',
			'</div>'
		].join("\n"));
	*/
	
}).call(this);