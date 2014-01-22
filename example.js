$(document).ready(function() {

	// Collection
	var people = new Backbone.Collection(_people);
	
	// Address cell - edit as form in modal dialog
	var AddressCell = Backgrid.Extension.ObjectCell.extend({
		formatter: {
			fromRaw: function(object) {
				return _.compact([
					object.address1 ? object.address1 : null,
					object.address2 ? object.address2 : null,
					object.city ? object.city : null,
					object.state ? object.state : null
				]).join(", ");
			}
		},
		schema: [
			{name: "address1", label: "Address1"},
			{name: "address2", label: "Address2"},
			{name: "city", label: "City"},
			{name: "state", label: "State"}
		]
	});
	
	// Children cell - edit as grid in modal dialog
	var ChildrenCell = Backgrid.Extension.ArrayObjectCell.extend({
		formatter: {
			fromRaw: function(array) {
				return _.map(array, function(object) {
					return object.firstName + " " + object.lastName + " (" + object.dob + ")"
				}).join(", ");
			}
		},
		gridOptions: {
			columns: [
				{name: "firstName", label: "First Name", cell: "string"},
				{name: "lastName", label: "Last Name", cell: "string"},
				{name: "dob", label: "Date of birth", cell: "string"}
			]
		}
	});

	// Grid
	var columns = [
			{name: "firstName", label: "First Name", cell: "string"},
			{name: "lastName", label: "Last Name", cell: "string"},
			{name: "address", label: "Address", cell: AddressCell},
			{name: "children", label: "Children", cell: ChildrenCell}
		],
		grid = new Backgrid.Grid({
			columns: columns,
			collection: people,
			className: "backgrid table"
		}),
		$grid = grid.render().$el;
	$("#result").append($grid);
  
});