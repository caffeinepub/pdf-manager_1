import Int "mo:core/Int";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  // Authorization system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile Type
  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  // User Profile Functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // PDF Management
  type PdfEntry = {
    id : Text;
    filename : Text;
    fileSize : Nat64;
    uploadTimestamp : Int;
    blob : Storage.ExternalBlob;
  };

  let pdfs = Map.empty<Text, PdfEntry>();

  module PdfEntry {
    public func compare(pdf1 : PdfEntry, pdf2 : PdfEntry) : Order.Order {
      Text.compare(pdf1.filename, pdf2.filename);
    };

    public func compareByTimestamp(pdf1 : PdfEntry, pdf2 : PdfEntry) : Order.Order {
      Int.compare(pdf1.uploadTimestamp, pdf2.uploadTimestamp);
    };

    public func compareByTimestampDesc(pdf1 : PdfEntry, pdf2 : PdfEntry) : Order.Order {
      Int.compare(pdf2.uploadTimestamp, pdf1.uploadTimestamp);
    };
  };

  include MixinStorage();

  public shared ({ caller }) func uploadPdf(id : Text, filename : Text, fileSize : Nat64, blob : Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can upload PDFs");
    };

    if (pdfs.containsKey(id)) {
      Runtime.trap("PDF with this ID already exists.");
    };

    let entry : PdfEntry = {
      id;
      filename;
      fileSize;
      uploadTimestamp = Time.now();
      blob;
    };

    pdfs.add(id, entry);
  };

  public query func getAllPdfs() : async [PdfEntry] {
    pdfs.values().toArray().sort(PdfEntry.compareByTimestampDesc);
  };

  public query func getPdf(id : Text) : async PdfEntry {
    switch (pdfs.get(id)) {
      case (null) { Runtime.trap("PDF not found") };
      case (?entry) { entry };
    };
  };

  public query func searchPdfs(searchTerm : Text) : async [PdfEntry] {
    pdfs.values().toArray().filter(
      func(pdf) {
        pdf.filename.toLower().contains(#text(searchTerm.toLower()));
      }
    ).sort(PdfEntry.compareByTimestampDesc);
  };

  public shared ({ caller }) func deletePdf(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete PDFs");
    };

    switch (pdfs.get(id)) {
      case (null) { Runtime.trap("PDF not found") };
      case (?_entry) {
        pdfs.remove(id);
      };
    };
  };

  public query func getLatestPdfs(limit : Nat) : async [PdfEntry] {
    let pdfEntries = pdfs.values().toArray().sort(PdfEntry.compareByTimestampDesc);

    if (limit >= pdfEntries.size()) {
      return pdfEntries;
    };

    pdfEntries.sliceToArray(0, limit);
  };
};
