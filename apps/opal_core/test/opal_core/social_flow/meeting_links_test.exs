defmodule OpalCore.SocialFlow.MeetingLinksTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.MeetingLinks

  test "accepts http(s) absolute URLs" do
    assert MeetingLinks.sanitize("https://zoom.us/j/123") == "https://zoom.us/j/123"
    assert MeetingLinks.sanitize("http://meet.google.com/abc-defg") ==
             "http://meet.google.com/abc-defg"
  end

  test "rejects javascript: and non-http schemes" do
    assert MeetingLinks.sanitize("javascript:alert(1)") == nil
    assert MeetingLinks.sanitize("data:text/html,hi") == nil
    assert MeetingLinks.sanitize("/relative/path") == nil
    assert MeetingLinks.sanitize("zoom.us/j/123") == nil
  end

  test "never invents a URL from empty input" do
    assert MeetingLinks.sanitize(nil) == nil
    assert MeetingLinks.sanitize("") == nil
    assert MeetingLinks.extract_from_text("Schedule a Zoom with Maya Tuesday") == nil
  end

  test "extracts first http(s) URL from free text" do
    text = "here is the link https://zoom.us/j/999 please"
    assert MeetingLinks.extract_from_text(text) == "https://zoom.us/j/999"
  end
end
