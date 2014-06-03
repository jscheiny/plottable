///<reference path="testReference.ts" />

var assert = chai.assert;


describe("Legends", () => {
  var svg: D3.Selection;
  var color: Plottable.ColorScale;
  var legend: Plottable.Legend;

  beforeEach(() => {
    svg = generateSVG(400, 400);
    color = new Plottable.ColorScale("Category10");
    legend = new Plottable.Legend(color);
  });

  it.skip("a basic legend renders", () => {
    color.domain(["foo", "bar", "baz"]);
    legend.renderTo(svg);
    var legends = legend.content.selectAll(".legend-row");

    legends.each(function(d, i) {
      assert.equal(d, color.domain()[i], "the data was set properly");
      var d3this = d3.select(this);
      var text = d3this.select("text").text();
      assert.equal(text, d, "the text node has correct text");
      var rectFill = d3this.select("rect").attr("fill");
      assert.equal(rectFill, color.scale(d), "the rect fill was set properly");
    });
    assert.lengthOf(legends[0], 3, "there were 3 legends");
    svg.remove();
  });

  it("legend domain can be updated after initialization, and height updates as well", () => {
    legend.renderTo(svg);
    legend.scale(color);
    assert.equal(legend._requestedSpace(200, 200).height, 0, "there is no requested height when domain is empty");
    color.domain(["foo", "bar"]);
    var height1 = legend._requestedSpace(400, 400).height;
    var actualHeight1 = legend.availableHeight;
    assert.operator(height1, ">", 0, "changing the domain gives a positive height");
    color.domain(["foo", "bar", "baz"]);
    assert.operator(legend._requestedSpace(400, 400).height, ">", height1, "adding to the domain increases the height requested");
    var actualHeight2 = legend.availableHeight;
    assert.operator(actualHeight1, "<", actualHeight2, "Changing the domain caused the legend to re-layout with more height");
    var numRows = legend.content.selectAll(".legend-row")[0].length;
    assert.equal(numRows, 3, "there are 3 rows");
    svg.remove();
  });

  it.skip("a legend with many labels does not overflow vertically", () => {
    color.domain(["alpha", "beta", "gamma", "delta", "omega", "omicron", "persei", "eight"]);
    legend.renderTo(svg);

    var totalHeight = 0;
    var legends = legend.content.selectAll(".legend-row");
    legends.each(function(d, i) {
      totalHeight += Plottable.DOMUtils.getBBox(d3.select(this).select("text")).height;
    });
    assert.lengthOf(legends[0], 8, "there were 8 legends");
    assert.operator(totalHeight, "<=", legend.availableHeight, "the legend did not overflow its space");
    svg.remove();
  });

  it("a legend with a long label does not overflow horizontally", () => {
    color.domain(["foooboooloonoogoorooboopoo"]);
    svg.attr("width", 100);
    legend.renderTo(svg);
    var text = legend.content.select("text").text();
    assert.notEqual(text, "foooboooloonoogoorooboopoo", "the text was truncated");
    var rightEdge = legend.content.select("text").node().getBoundingClientRect().right;
    var rightEdgeBBox = legend.element.select(".bounding-box").node().getBoundingClientRect().right;
    assert.operator(rightEdge, "<=", rightEdgeBBox, "the long text did not overflow the legend");
    svg.remove();
  });

  it("calling legend.render multiple times does not add more elements", () => {
    color.domain(["foo", "bar", "baz"]);
    legend.renderTo(svg);
    var numRows = legend.content.selectAll(".legend-row")[0].length;
    assert.equal(numRows, 3, "there are 3 legend rows initially");
    legend._render();
    numRows = legend.content.selectAll(".legend-row")[0].length;
    assert.equal(numRows, 3, "there are 3 legend rows after second render");
    svg.remove();
  });

  it("re-rendering the legend with a new domain will do the right thing", () => {
    color.domain(["foo", "bar", "baz"]);
    legend.renderTo(svg);
    var newDomain = ["mushu", "foo", "persei", "baz", "eight"];
    color.domain(newDomain);
    // due to how joins work, this is how the elements should be arranged by d3
    var newDomainActualOrder = ["foo", "baz", "mushu", "persei", "eight"];
    legend.content.selectAll(".legend-row").each(function(d, i) {
      assert.equal(d, newDomainActualOrder[i], "the data is set correctly");
      var text = d3.select(this).select("text").text();
      assert.equal(text, d, "the text was set properly");
      var fill = d3.select(this).select("circle").attr("fill");
      assert.equal(fill, color.scale(d), "the fill was set properly");
    });
    assert.lengthOf(legend.content.selectAll(".legend-row")[0], 5, "there are the right number of legend elements");
    svg.remove();
  });

  it("legend.scale() replaces domain", () => {
    color.domain(["foo", "bar", "baz"]);
    legend.renderTo(svg);

    var newDomain = ["a", "b", "c"];
    var newColorScale = new Plottable.ColorScale("20");
    newColorScale.domain(newDomain);
    legend.scale(newColorScale);

    legend.content.selectAll(".legend-row").each(function(d, i) {
      assert.equal(d, newDomain[i], "the data is set correctly");
      var text = d3.select(this).select("text").text();
      assert.equal(text, d, "the text was set properly");
      var fill = d3.select(this).select("circle").attr("fill");
      assert.equal(fill, newColorScale.scale(d), "the fill was set properly");
    });

    svg.remove();
  });

  it("legend.scale() correctly reregisters listeners", () => {
    color.domain(["foo", "bar", "baz"]);
    legend.renderTo(svg);

    var tempDomain = ["a", "b", "c"];
    var newColorScale = new Plottable.ColorScale("20");
    newColorScale.domain(tempDomain);
    legend.scale(newColorScale);

    var newDomain = ["a", "foo", "d"];
    newColorScale.domain(newDomain);
    legend.content.selectAll(".legend-row").each(function(d, i) {
      assert.equal(d, newDomain[i], "the data is set correctly");
      var text = d3.select(this).select("text").text();
      assert.equal(text, d, "the text was set properly");
      var fill = d3.select(this).select("circle").attr("fill");
      assert.equal(fill, newColorScale.scale(d), "the fill was set properly");
    });
    svg.remove();
  });

  describe("ToggleLegend tests", () => {
    var toggleLegend: Plottable.ToggleLegend;

    beforeEach(() => {
      toggleLegend = new Plottable.ToggleLegend(color, (d, b) => d);
    });

    function verifyState(selection: D3.Selection, b: boolean, msg?: string) {
      assert.equal(selection.classed("toggled-on"), b, msg);
      assert.equal(selection.classed("toggled-off"), !b, msg);
    }

    function getSelection(datum: any) {
      var selection = toggleLegend.content.selectAll(".legend-row")
        .filter((d, i) => d === datum);
      return selection;
    }

    function verifyEntry(datum: any, b: boolean, msg?: string) {
      verifyState(getSelection(datum), b, msg);
    }

    function toggleEntry(datum: any, index: number) {
      getSelection(datum).on("click")(datum, index);
    }

    it("basic initialization test", () => {
      color.domain(["a", "b", "c", "d", "e"]);
      toggleLegend.renderTo(svg);
      toggleLegend.content.selectAll(".legend-row").each(function(d, i) {
        var selection = d3.select(this);
        verifyState(selection, true);
      });
      svg.remove();
    });

    it("basic toggling test", () => {
      color.domain(["a"]);
      toggleLegend.renderTo(svg);
      toggleLegend.content.selectAll(".legend-row").each(function(d, i) {
        var selection = d3.select(this);
        selection.on("click")(d, i);
        verifyState(selection, false);
        selection.on("click")(d, i);
        verifyState(selection, true);
      });
      svg.remove();
    });

    it("toggleLegend.scale() works as intended", () => {
      var domain = ["a", "b", "c", "d", "e"];
      color.domain(domain);
      toggleLegend.renderTo(svg);
      toggleEntry("a", 1);
      toggleEntry("d", 4);
      toggleEntry("c", 3);

      var newDomain = ["r", "a", "d", "g"];
      var newColorScale = new Plottable.ColorScale("Category10");
      newColorScale.domain(newDomain);
      toggleLegend.scale(newColorScale);

      verifyEntry("r", true);
      verifyEntry("a", false);
      verifyEntry("g", true);
      verifyEntry("d", false);

      svg.remove();
    });

    it("listeners on scale will correctly update states", () =>  {
      color.domain(["a", "b", "c", "d", "e"]);
      toggleLegend.renderTo(svg);
      toggleEntry("a", 1);
      toggleEntry("d", 4);
      toggleEntry("c", 3);

      color.domain(["e", "d", "b", "a", "c"]);
      verifyEntry("a", false);
      verifyEntry("b", true);
      verifyEntry("c", false);
      verifyEntry("d", false);
      verifyEntry("e", true);
      svg.remove();
    });
  });
});
